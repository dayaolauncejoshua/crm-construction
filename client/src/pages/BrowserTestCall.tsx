// client/src/pages/BrowserTestCall.tsx
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Play } from "lucide-react";

type Status = "idle" | "recording" | "processing" | "playing";

export default function BrowserTestCall() {
  const [status, setStatus] = useState<Status>("idle");
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      // Ask for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = []; // Clear previous chunks

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      // When 'stop' is called, send the audio
      mediaRecorderRef.current.onstop = sendAudioToServer;

      mediaRecorderRef.current.start();
      setStatus("recording");
      setAiAudioUrl(null); // Clear previous audio
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording. Please grant microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("processing");
      // Stop the mic track
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const sendAudioToServer = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      // Send audio to the new backend route
      const response = await fetch("/api/browser-test", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Get the AI's audio response
      const aiAudioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(aiAudioBlob);
      setAiAudioUrl(audioUrl);
      setStatus("idle");

      // Automatically play the audio
      playAudio(audioUrl);
    } catch (error) {
      console.error("Error sending audio:", error);
      setStatus("idle");
      alert("Error processing audio. See console for details.");
    }
  };

  const playAudio = (url: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audioPlayer = new Audio(url);
    audioPlayerRef.current = audioPlayer;
    audioPlayer.play();
    setStatus("playing");
    audioPlayer.onended = () => {
      setStatus("idle");
    };
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        AI Browser Test ("Walkie-Talkie")
      </h1>
      <p className="text-gray-600 mb-6">
        Press 'Record' to start talking. Press 'Stop' to send your audio to the
        AI. The AI's response will play automatically. This tests your AI's
        logic, not the real-time call.
      </p>

      <div className="flex flex-col items-center gap-4">
        {status === "idle" && (
          <Button size="lg" onClick={startRecording}>
            <Mic className="mr-2 h-5 w-5" />
            Record
          </Button>
        )}

        {status === "recording" && (
          <Button size="lg" variant="destructive" onClick={stopRecording}>
            <Square className="mr-2 h-5 w-5" />
            Stop
          </Button>
        )}

        {status === "processing" && (
          <Button size="lg" disabled>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </Button>
        )}

        {status === "playing" && (
          <Button size="lg" disabled>
            <Play className="mr-2 h-5 w-5" />
            Playing...
          </Button>
        )}

        {aiAudioUrl && status === "idle" && (
          <div className="mt-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => playAudio(aiAudioUrl)}
            >
              <Play className="mr-2 h-5 w-5" />
              Play Last Response
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
