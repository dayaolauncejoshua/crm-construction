import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, PhoneOff, Loader2, Mic, MicOff } from "lucide-react";

export default function VOIPTest() {
  const [callActive, setCallActive] = useState(false);
  const [callId, setCallId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startTestCall = async () => {
    setLoading(true);
    setError("");
    setTranscription("");

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Generate unique call ID for testing
      const testCallId = "browser_test_" + Date.now();
      setCallId(testCallId);

      // Call backend to start the call
      const response = await fetch("/api/phone/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: testCallId,
          isTestMode: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start test call");
      }

      setCallActive(true);
      setTranscription("🎤 Call started. Listening...");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`❌ Failed to start call: ${errorMsg}`);
      setLoading(false);

      // Cleanup on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    } finally {
      setLoading(false);
    }
  };

  const endTestCall = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/phone/end-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });

      if (!response.ok) {
        throw new Error("Failed to end call");
      }

      setCallActive(false);
      setCallId("");
      setTranscription("Call ended");

      // Stop all audio tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to end call: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🧪 VOIP Test (Browser)</CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Test your AI assistant in the browser
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Card */}
          <div className="bg-slate-100 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-3">
              {callActive ? (
                <div className="w-12 h-12 rounded-full bg-green-500 animate-pulse flex items-center justify-center">
                  <Phone className="text-white w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center">
                  <Phone className="text-slate-600 w-6 h-6" />
                </div>
              )}
            </div>
            <p className="font-semibold text-lg">
              {callActive ? "🔴 Call Active" : "⚪ Ready to Test"}
            </p>
            {callId && (
              <p className="text-xs text-slate-500 mt-2">Call ID: {callId}</p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transcription Display */}
          {transcription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">{transcription}</p>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-3">
            {!callActive ? (
              <Button
                onClick={startTestCall}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Start Test Call
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleMute}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-5"
                >
                  {isMuted ? (
                    <>
                      <MicOff className="mr-2 h-5 w-5" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Mute
                    </>
                  )}
                </Button>

                <Button
                  onClick={endTestCall}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    <>
                      <PhoneOff className="mr-2 h-5 w-5" />
                      End Call
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-slate-700">
            <p className="font-semibold mb-2">ℹ️ How to Test:</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Click "Start Test Call"</li>
              <li>✅ Allow microphone access when prompted</li>
              <li>✅ Speak to the AI assistant</li>
              <li>✅ Click "End Call" to finish</li>
            </ul>
          </div>

          {/* Test Mode Badge */}
          <div className="text-center">
            <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
              🧪 TEST MODE - FREE
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
