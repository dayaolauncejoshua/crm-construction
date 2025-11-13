import { useState, useEffect, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

export default function VOIPDialer() {
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const deviceRef = useRef<Device | null>(null);

  useEffect(() => {
    const initDevice = async () => {
      try {
        setStatus("Fetching access token...");

        const response = await fetch("/api/twilio/token");

        if (!response.ok) {
          throw new Error(`Failed to get access token: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Token received:", data.identity);

        setStatus("Initializing device...");
        const newDevice = new Device(data.token, {
          logLevel: 1,
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });

        newDevice.on("registered", () => {
          console.log("✅ Device registered");
          setStatus("Ready to call");
        });

        newDevice.on("error", (error) => {
          console.error("❌ Device error:", error);
          setStatus(`Error: ${error.message}`);
        });

        newDevice.on("incoming", (incomingCall) => {
          console.log("📞 Incoming call from:", incomingCall.parameters.From);
          setCall(incomingCall);
          setStatus("Incoming call...");
        });

        await newDevice.register();
        setDevice(newDevice);
        deviceRef.current = newDevice;
      } catch (error) {
        console.error("❌ Failed to initialize device:", error);
        setStatus(
          `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    initDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, []);

  const makeCall = async () => {
    if (!device) {
      setStatus("Device not ready");
      return;
    }

    try {
      setIsConnecting(true);
      setStatus("Connecting...");

      const params = {
        To: phoneNumber || "test-call",
      };

      console.log("📞 Making call to:", params.To);

      const outgoingCall = await device.connect({ params });

      outgoingCall.on("accept", () => {
        console.log("✅ Call accepted");
        setStatus("Connected");
        setIsConnecting(false);
      });

      outgoingCall.on("disconnect", () => {
        console.log("📴 Call ended");
        setStatus("Call ended");
        setCall(null);
        setIsConnecting(false);
      });

      outgoingCall.on("cancel", () => {
        console.log("🚫 Call cancelled");
        setStatus("Call cancelled");
        setCall(null);
        setIsConnecting(false);
      });

      outgoingCall.on("error", (error) => {
        console.error("❌ Call error:", error);
        setStatus(`Call error: ${error.message}`);
        setIsConnecting(false);
      });

      setCall(outgoingCall);
    } catch (error) {
      console.error("❌ Failed to make call:", error);
      setStatus(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsConnecting(false);
    }
  };

  const hangUp = () => {
    if (call) {
      call.disconnect();
      setCall(null);
      setStatus("Ready to call");
    }
  };

  const toggleMute = () => {
    if (call) {
      call.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>VOIP Dialer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              status === "Ready to call"
                ? "bg-green-100 text-green-800"
                : status.includes("Connected")
                ? "bg-blue-100 text-blue-800"
                : status.includes("Error") || status.includes("Failed")
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {status}
          </div>
        </div>

        <div>
          <Input
            type="text"
            placeholder="Phone number (optional - leave empty to test)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={!!call || isConnecting}
          />
          <p className="text-xs text-slate-500 mt-1">
            Leave empty for direct AI test (FREE!)
          </p>
        </div>

        <div className="flex gap-2">
          {!call ? (
            <Button
              onClick={makeCall}
              disabled={!device || isConnecting}
              className="flex-1"
              size="lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              {isConnecting ? "Connecting..." : "Call"}
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                {isMuted ? (
                  <MicOff className="mr-2 h-5 w-5" />
                ) : (
                  <Mic className="mr-2 h-5 w-5" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                onClick={hangUp}
                variant="destructive"
                size="lg"
                className="flex-1"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                Hang Up
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p>
            💡 <strong>Tip:</strong> Leave number empty to test your AI for
            FREE!
          </p>
          <p>
            📞 <strong>Cost:</strong> Browser testing = $0.00
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
