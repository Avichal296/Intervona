import { useEffect, useRef } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { useParams } from "react-router-dom";

export const Interview = () => {
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
const micContextRef = useRef<AudioContext | null>(null);
const processorRef = useRef<ScriptProcessorNode | null>(null);

  const { id } = useParams<{ id: string }>();
  function playPCM16(audioData: string) {
    let audioContext = audioContextRef.current;
  
    if (!audioContext) {
      audioContext = new AudioContext({
        sampleRate: 24000,
      });
  
      audioContextRef.current = audioContext;
    }
  
    const binary = atob(audioData);
    const bytes = new Uint8Array(binary.length);
  
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  
    const pcm16 = new Int16Array(bytes.buffer);
  
    const audioBuffer = audioContext.createBuffer(
      1,
      pcm16.length,
      24000
    );
  
    const channelData = audioBuffer.getChannelData(0);
  
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768;
    }
  
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
  
    const startTime = Math.max(
      audioContext.currentTime,
      nextPlayTimeRef.current
    );
  
    source.start(startTime);
  
    nextPlayTimeRef.current =
      startTime + audioBuffer.duration;
  }
  async function startMicrophone(session: any) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  
    console.log("Microphone connected ✅");
  
    const micContext = new AudioContext({
      sampleRate: 16000,
    });
  
    const source = micContext.createMediaStreamSource(stream);
  
    const processor = micContext.createScriptProcessor(
      4096,
      1,
      1
    );
  
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
  
      const pcm16 = new Int16Array(input.length);
  
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
  
        pcm16[i] =
          sample < 0
            ? sample * 0x8000
            : sample * 0x7fff;
      }
  
      const bytes = new Uint8Array(pcm16.buffer);
  
      let binary = "";
  
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
  
      const base64Audio = btoa(binary);
  
      session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };
  
    const gain = micContext.createGain();
gain.gain.value = 0;

source.connect(processor);
processor.connect(gain);
gain.connect(micContext.destination);
    console.log("Microphone streaming to Gemini ✅");
  }
  useEffect(() => {
    if (!id) return;

    const connectGemini = async () => {
      try {
        // 1. Get interview data from backend
        const interviewResponse = await fetch(
          `http://localhost:3001/api/v1/interview/${id}`
        );

        if (!interviewResponse.ok) {
          throw new Error("Failed to fetch interview data");
        }

        const interview = await interviewResponse.json();

        console.log(
          "Interview data received ✅",
          interview
        );

        // 2. Get ephemeral token from backend
        const tokenResponse = await fetch(
          "http://localhost:3001/api/v1/gemini-token"
        );

        if (!tokenResponse.ok) {
          throw new Error("Failed to get Gemini token");
        }

        const { token } = await tokenResponse.json();

        console.log("Ephemeral token received ✅");

        // 3. Create Gemini client using temporary token
        const ai = new GoogleGenAI({
          apiKey: token,
        });

        // 4. Create Live session
        const session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",

          config: {
            responseModalities: [Modality.AUDIO],

            systemInstruction: {
              parts: [
                {
                  text: `
You are a professional technical interviewer.

Interview flow:
1. Introduce yourself by saying:
   "Hi, I am an AI interviewer."
2. Ask the candidate to introduce themselves.
3. Listen to their complete introduction.
4. Then begin the technical interview.
5. Ask exactly one complete question at a time.
6. Wait for the candidate's answer before asking the next question.
7. Ask relevant follow-up questions based on the answer.
8. Never ask incomplete fragments such as "principles?" or "other?".
9. Never ask multiple questions at once.
10. Never reveal that the interview context came from GitHub metadata.
11. Speak naturally and clearly.
                  `,
                },
              ],
            },
          },

          callbacks: {
            onopen: () => {
              console.log("Gemini session opened ✅");
            },

            onmessage: (message) => {
              console.log("Gemini message:", message);
            
              const content = message.serverContent;
            
              if (content?.inputTranscription) {
                console.log(
                  "User:",
                  content.inputTranscription.text
                );
              }
            
              if (content?.outputTranscription) {
                console.log(
                  "Gemini:",
                  content.outputTranscription.text
                );
              }
            
              if (content?.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    const audioData = part.inlineData.data;
            
                    console.log(
                      "AI audio received:",
                      audioData.length
                    );
            
                    playPCM16(audioData);
                  }
                }
              }
            },

            onerror: (error) => {
              console.error("Gemini error:", error);
            },

            onclose: (event) => {
              console.log(
                "Gemini session closed:",
                event.reason
              );
            },
          },
        });

        sessionRef.current = session;

        console.log("Gemini session created ✅");

        // 5. Give Gemini the candidate context
        session.sendRealtimeInput({
          text: `
Candidate interview context:

${JSON.stringify(interview.githubMetaData)}

Use this context internally to ask relevant technical
questions and follow-up questions.

Do not tell the candidate that this context came from
GitHub metadata.
          `,
        });
        await startMicrophone(session);
        

        // 6. Start conversation
        session.sendRealtimeInput({
          text: `
        Candidate interview context:
        ${JSON.stringify(interview.githubMetaData)}
        
        Begin the interview now.
        Introduce yourself as an AI interviewer and ask the candidate to introduce themselves.
        Use the candidate context internally for future technical follow-up questions.
        Do not mention GitHub metadata.
        `,
        });

      } catch (error) {
        console.error(
          "Gemini connection failed:",
          error
        );
      }
    };

    connectGemini();

    return () => {
      sessionRef.current?.close();
      sessionRef.current = null;
    
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    
      processorRef.current?.disconnect();
      micContextRef.current?.close();
      audioContextRef.current?.close();
    
      mediaStreamRef.current = null;
      processorRef.current = null;
      micContextRef.current = null;
      audioContextRef.current = null;
    };
    },[id]);

  return (
    <div>
      <h1>Interview</h1>
    </div>
  );
};