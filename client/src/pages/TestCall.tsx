// client/src/pages/TestCall.tsx

import { useState } from "react";
import {
  RealtimeSession,
  type TransportLayerAudio,
} from "@openai/agents/realtime";
import { Button } from "@/components/ui/button";

// A simple audio utility to play the audio bytes from the API
const audioContext = new (window.AudioContext ||
  (window as any).webkitAudioContext)();

const playAudio = (audioData: ArrayBuffer) => {
  audioContext.decodeAudioData(audioData, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  });
};

function TestCallPage() {
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Not connected");

  const startCall = async () => {
    try {
      setStatus("1. Requesting session from your server...");

      const response = await fetch("/api/test-call/start-session", {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start session");
      }

      const { client_secret } = await response.json(); // 👈 No stream_id needed

      setStatus("2. Got token. Connecting to OpenAI...");

      // 1. Create the session with an EMPTY constructor
      const newSession = new RealtimeSession();

      // 2. Handle incoming audio from the AI
      newSession.on("audio", (event: TransportLayerAudio) => {
        // 👈 Use TransportLayerAudio type
        console.log("Received audio chunk from AI");
        playAudio(event.data); // 👈 Get audio from event.data
      });

      // 3. Handle errors
      newSession.on("error", (error: RealtimeSessionError) => {
        // 👈 Use RealtimeSessionError type
        setStatus(`Error: ${error.message}`); // 👈 Get message from error.message
        console.error(error);
        setIsCalling(false);
      });

      // 4. Connect. This will ask for microphone permission.
      // Pass the client_secret as the apiKey
      await newSession.connect({ apiKey: client_secret });

      // 5. Set status AFTER await .connect() finishes
      setStatus("4. Connected! Speak into your microphone.");
      setIsCalling(true);
      setSession(newSession);
    } catch (error) {
      const err = error as Error;
      setStatus(`Failed to start call: ${err.message}`);
      console.error(error);
    }
  };

  const endCall = () => {
    if (session) {
      session.close();
      // Set status right here when you end the call
      setStatus("Call ended.");
      setIsCalling(false);
      setSession(null);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-3xl font-bold mb-4">Browser Call Test Page</h1>
      <p className="mb-6 text-slate-600">
        Click "Start Call" to connect directly to the OpenAI Realtime API using
        WebRTC. This bypasses the phone network completely.
      </p>

      <div className="mb-6">
        <strong className="text-gray-800">Status:</strong>
        <span className="font-mono p-2 bg-slate-100 rounded-md ml-2 text-sm">
          {status}
        </span>
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={startCall}
          disabled={isCalling}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Start Call
        </Button>
        <Button onClick={endCall} disabled={!isCalling} variant="destructive">
          End Call
        </Button>
      </div>
    </div>
  );
}

export default TestCallPage;
