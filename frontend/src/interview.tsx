import { useEffect } from "react";
import {  useRef } from "react";

export const Interview = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  useEffect(() => {
    // IMPORTANT:
    const API_KEY = "AQ.Ab8RN6KB1ztnSx1dr10qT6E_Wj6iTCjQSZYSLwn3ARc7WhZgdA";

    const MODEL_NAME = "gemini-3.1-flash-live-preview";

    const WS_URL =
      `wss://generativelanguage.googleapis.com/ws/` +
      `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` +
      `?key=${API_KEY}`;

    const websocket = new WebSocket(WS_URL);
    function playPCM16(audioData: string) {
      const audioContext = audioContextRef.current;
    
      if (!audioContext) return;
    
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
    
      // Queue this chunk after previous chunks
      const startTime = Math.max(
        audioContext.currentTime,
        nextPlayTimeRef.current
      );
    
      source.start(startTime); // ✅ IMPORTANT
    
      nextPlayTimeRef.current =
        startTime + audioBuffer.duration;
    }
    // 1. Connection open
    websocket.onopen = () => {
      console.log("WebSocket Connected ✅");
      
      
      audioContextRef.current = new AudioContext({
        sampleRate: 24000,
      });
      // 2. Initial setup
      const setupMessage = {
        setup: {
          model: `models/${MODEL_NAME}`,
      
          generationConfig: {
            responseModalities: ["AUDIO"],
          },
      
          systemInstruction: {
            parts: [
              {
                text: `
          You are a professional technical interviewer conducting a structured software engineering interview.
          
          Rules:
          - Start the interview by asking exactly ONE complete technical question.
          - Never ask incomplete questions like "principles?" or "other?".
          - Never output random fragments.
          - Ask a clear question related to backend development.
          - Wait for the candidate's answer before asking the next question.
          - Ask follow-up questions based on the candidate's previous answer.
          - Keep each question concise and specific.
          - Do not explain the answer unless the candidate asks.
          - Do not ask multiple questions at once.
          - Speak naturally like a real interviewer.
          
          Your first question should be:
          "Can you explain how you would design the backend architecture for a real-time AI interview application?"
                `,
              },
            ],
          },
        },
      };
        websocket.send(JSON.stringify(setupMessage));
        console.log("Configuration sent ✅")

        
        
å
      // 3. For now, test with TEXT only
    //   const textMessage = {
    //     realtimeInput: {
    //       text: "Start the interview and ask me the first backend question.",
    //     },
    //   };

    //   websocket.send(JSON.stringify(textMessage));

    //   console.log("Text sent ✅");
    };

    // 4. Receive everything from Gemini
    websocket.onmessage = async  (event) => {
        let data = event.data;
        // Browser mein message Blob aa sakta hai
        if (data instanceof Blob) {
          data = await data.text();
        }
    
        const response = JSON.parse(data);
        if (response.serverContent?.interrupted) {
          console.log("Gemini interrupted");
        
          nextPlayTimeRef.current = audioContextRef.current?.currentTime ?? 0;
        }
      console.log("Gemini response:", response);
      console.log("RAW GEMINI MESSAGE:", event.data);

      try {
        // const response = JSON.parse(event.data);
        console.log("PARSED GEMINI RESPONSE:", response);
        
        if (response.setupComplete) {
            console.log("Gemini setup complete ✅");
      
            // const textMessage = {
            //   realtimeInput: {
            //     text: "Start the interview and introduce yourself first and then ask him/her to give the introduce themselves",
            //   },
            // };
            const textMessage = {
              realtimeInput: {
                text: " tell about yourself first and then ask them to introduce themselves and then ask  the next question related to your github metadata",
              },
            };
      
            websocket.send(JSON.stringify(textMessage));
      
            console.log("Text sent ✅");
          }
      
      } catch (error) {
        console.error("Failed to parse:", error);
      }

      if (response.serverContent) {
        const serverContent = response.serverContent;

        // User transcript
        if (serverContent.inputTranscription) {
          console.log(
            "User:",
            serverContent.inputTranscription.text
          );
          if (serverContent.modelTurn?.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                const audioData = part.inlineData.data;
          
                const binary = atob(audioData);
          
                const bytes = new Uint8Array(binary.length);
          
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
          
                const pcm16 = new Int16Array(
                  bytes.buffer
                );
          
                console.log("PCM samples:", pcm16.length);
              }
            }
          }
        }

        // Gemini transcript
        if (serverContent.outputTranscription) {
          console.log(
            "Gemini:",
            serverContent.outputTranscription.text
          );
        }

        // AI audio received
        if (serverContent.modelTurn?.parts) {
          for (const part of serverContent.modelTurn.parts) {
            if (part.inlineData) {
              const audioData = part.inlineData.data;

              console.log(
                "AI audio received:",
                audioData.length
              );
              playPCM16(audioData);
            }


          }
        }
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket Error ❌", error);
    };

    websocket.onclose = (event) => {
        
            console.log("WebSocket Closed");
            console.log("Code:", event.code);
            console.log("Reason:", event.reason);
            console.log("Was clean:", event.wasClean);
          
    };

    // Cleanup when Interview component unmounts
    return () => {
      websocket.close();
    };
  }, []);

  return (

      <div>
          websocket.close();
      {/* <h1>Interview</h1> */}
    </div>
  );
};