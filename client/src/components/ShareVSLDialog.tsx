import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  Link2,
  Linkedin,
  Facebook,
  Twitter,
  Send,
  Mail,
  Check,
  MessageCircle,
  Code,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface ShareVSLDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vsl: {
    id: string;
    title: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
}

export function ShareVSLDialog({
  open,
  onOpenChange,
  vsl,
}: ShareVSLDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  // ✅ Generate shareable URL (use actual video URL or fallback)
  const shareUrl = vsl.videoUrl || `${window.location.origin}/vsl/${vsl.id}`;
  const shareTitle = vsl.title;
  const shareDescription = `Check out this video: ${vsl.title}`;

  // ✅ Generate embed code
  const getEmbedCode = () => {
    if (!vsl.videoUrl) {
      return "<!-- Video URL not available yet -->";
    }
    return `<iframe src="${vsl.videoUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
  };

  // ✅ Copy to clipboard
  const copyToClipboard = async (text: string, type: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === "link") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setEmbedCopied(true);
        setTimeout(() => setEmbedCopied(false), 2000);
      }

      toast({
        title: "Copied!",
        description: `${
          type === "link" ? "Link" : "Embed code"
        } copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  // ✅ Native share API (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully!",
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled");
      }
    } else {
      // Fallback to copy
      copyToClipboard(shareUrl, "link");
    }
  };

  // ✅ Social media share handlers
  const shareHandlers = {
    // Priority 1
    linkedin: () => {
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        shareUrl
      )}`;
      window.open(url, "_blank", "width=600,height=600");
    },

    whatsapp: () => {
      const text = encodeURIComponent(`${shareTitle}\n\n${shareUrl}`);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const url = isMobile
        ? `whatsapp://send?text=${text}`
        : `https://web.whatsapp.com/send?text=${text}`;
      window.open(url, "_blank");
    },

    email: () => {
      const subject = encodeURIComponent(`Check out: ${shareTitle}`);
      const body = encodeURIComponent(
        `I thought you might be interested in this video:\n\n${shareTitle}\n\n${shareUrl}`
      );
      // ✅ Gmail web compose URL
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
      window.open(gmailUrl, "_blank");
    },

    // Priority 2
    facebook: () => {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}`;
      window.open(url, "_blank", "width=600,height=600");
    },

    twitter: () => {
      const text = encodeURIComponent(shareTitle);
      const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
        shareUrl
      )}`;
      window.open(url, "_blank", "width=600,height=600");
    },

    // Priority 3
    messenger: () => {
      const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
        shareUrl
      )}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(
        window.location.origin
      )}`;
      window.open(url, "_blank", "width=600,height=600");
    },

    telegram: () => {
      const text = encodeURIComponent(shareTitle);
      const url = `https://t.me/share/url?url=${encodeURIComponent(
        shareUrl
      )}&text=${text}`;
      window.open(url, "_blank", "width=600,height=600");
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Share2 className="h-5 w-5" />
              Share Video
            </DialogTitle>
            <DialogDescription className="line-clamp-1">
              {vsl.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 mt-4">
            {/* ✅ Native Share (Mobile) */}
            {"share" in navigator && (
              <>
                <Button
                  variant="default"
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleNativeShare}
                  disabled={!vsl.videoUrl}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share via...
                </Button>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                    or share directly
                  </span>
                </div>
              </>
            )}

            {/* ✅ Copy Link Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Video Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-xs sm:text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(shareUrl, "link")}
                  className="shrink-0"
                  disabled={!vsl.videoUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* ✅ Priority 1 & 2: Main Social Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Share on social media
              </Label>

              <div className="grid grid-cols-2 gap-2">
                {/* LinkedIn - Priority 1 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.linkedin}
                  disabled={!vsl.videoUrl}
                >
                  <Linkedin className="h-4 w-4 text-[#0A66C2] shrink-0" />
                  <span className="text-xs sm:text-sm">LinkedIn</span>
                </Button>

                {/* WhatsApp - Priority 1 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.whatsapp}
                  disabled={!vsl.videoUrl}
                >
                  <Send className="h-4 w-4 text-[#25D366] shrink-0" />
                  <span className="text-xs sm:text-sm">WhatsApp</span>
                </Button>

                {/* Facebook - Priority 2 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.facebook}
                  disabled={!vsl.videoUrl}
                >
                  <Facebook className="h-4 w-4 text-[#1877F2] shrink-0" />
                  <span className="text-xs sm:text-sm">Facebook</span>
                </Button>

                {/* Twitter/X - Priority 2 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.twitter}
                  disabled={!vsl.videoUrl}
                >
                  <Twitter className="h-4 w-4 text-[#1DA1F2] shrink-0" />
                  <span className="text-xs sm:text-sm">Twitter</span>
                </Button>

                {/* Gmail - Priority 1 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3 col-span-2"
                  onClick={shareHandlers.email}
                  disabled={!vsl.videoUrl}
                >
                  <Mail className="h-4 w-4 text-[#EA4335] shrink-0" />
                  <span className="text-xs sm:text-sm">Gmail</span>
                </Button>
              </div>
            </div>

            {/* ✅ Priority 3: Additional Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                More options
              </Label>

              <div className="grid grid-cols-2 gap-2">
                {/* Messenger - Priority 3 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.messenger}
                  disabled={!vsl.videoUrl}
                >
                  <MessageCircle className="h-4 w-4 text-[#0084FF] shrink-0" />
                  <span className="text-xs sm:text-sm">Messenger</span>
                </Button>

                {/* Telegram - Priority 3 */}
                <Button
                  variant="outline"
                  className="justify-start gap-2 sm:gap-3"
                  onClick={shareHandlers.telegram}
                  disabled={!vsl.videoUrl}
                >
                  <Send className="h-4 w-4 text-[#0088cc] shrink-0" />
                  <span className="text-xs sm:text-sm">Telegram</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* ✅ Embed Code Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Embed Code</Label>
              <div className="flex gap-2">
                <Textarea
                  value={getEmbedCode()}
                  readOnly
                  className="flex-1 font-mono text-[10px] sm:text-xs resize-none"
                  rows={3}
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(getEmbedCode(), "embed")}
                  className="shrink-0 self-start"
                  disabled={!vsl.videoUrl}
                >
                  {embedCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Code className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* ✅ Close Button */}
          <div className="flex justify-end pt-4 mt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
