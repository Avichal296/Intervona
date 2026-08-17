import { useEffect } from "react";

export const Interview = () => {
  useEffect(() => {
    // IMPORTANT:
    // Yahan NEW API KEY use karna, jo abhi expose nahi hui hai.
    const API_KEY = "AQ.Ab8RN6KB1ztnSx1dr10qT6E_Wj6iTCjQSZYSLwn3ARc7WhZgdA";

    const MODEL_NAME = "gemini-3.1-flash-live-preview";

    const WS_URL =
      `wss://generativelanguage.googleapis.com/ws/` +
      `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` +
      `?key=${API_KEY}`;

    const websocket = new WebSocket(WS_URL);

    // 1. Connection open
    websocket.onopen = () => {
      console.log("WebSocket Connected ✅");

      // 2. Initial setup
      const setupMessage = {
        setup: {
          model: `models/${MODEL_NAME}`,
          responseModalities: ["AUDIO"],
          systemInstruction: {
            parts: [
              {
                text: "You are a professional technical interviewer. Ask one question at a time.",
              },
            ],
          },
        },
      };

      websocket.send(JSON.stringify(setupMessage));

      console.log("Configuration sent ✅");

      // 3. For now, test with TEXT only
      const textMessage = {
        realtimeInput: {
          text: "Start the interview and ask me the first backend question.",
        },
      };

      websocket.send(JSON.stringify(textMessage));

      console.log("Text sent ✅");
    };

    // 4. Receive everything from Gemini
    websocket.onmessage = (event) => {
      const response = JSON.parse(event.data);

      console.log("Gemini response:", response);

      if (response.serverContent) {
        const serverContent = response.serverContent;

        // User transcript
        if (serverContent.inputTranscription) {
          console.log(
            "User:",
            serverContent.inputTranscription.text
          );
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
            }
          }
        }
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket Error ❌", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket Closed");
    };

    // Cleanup when Interview component unmounts
    return () => {
      websocket.close();
    };
  }, []);

  return (

      <div>
        websocket.close();
      <h1>Interview</h1>
    </div>
  );
};