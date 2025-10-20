import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquareText } from "lucide-react";

interface TranscriptModalProps {
  callId: string | null;
  onClose: () => void;
}

export default function TranscriptModal({
  callId,
  onClose,
}: TranscriptModalProps) {
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callId) return;
    const fetchTranscript = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/transcripts/${callId}`);
        if (!res.ok) throw new Error("Transcript not found");
        const data = await res.json();
        setTranscript(data.transcript || "No transcript available.");
      } catch (err) {
        console.error(err);
        setTranscript("Failed to load transcript.");
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [callId]);

  return (
    <Dialog open={!!callId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-blue-600" />
            Call Transcript
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
          </div>
        ) : (
          <ScrollArea className="h-96 border rounded-md p-3 bg-slate-50 text-sm leading-relaxed">
            <pre className="whitespace-pre-wrap text-slate-700">
              {transcript}
            </pre>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
