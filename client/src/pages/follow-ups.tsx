import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
  Play,
  Pause,
  Plus,
  Trash2,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  channel: string;
  status: string;
  isDefault: boolean;
  steps: FollowUpStep[];
}

interface FollowUpStep {
  id: string;
  stepNumber: number;
  delayMinutes: number;
  content: string;
  channel: string;
}

interface PendingFollowUp {
  id: string;
  leadName: string;
  leadCompany?: string;
  content: string;
  scheduledFor: string;
  status: string;
  stepNumber: number;
}

interface FollowUpStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export default function FollowUpsPage() {
  usePageTitle("Follow-ups");
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>(
    []
  );
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch(`/api/clients?userId=${user?.id}`);
        const data = await res.json();
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    }

    if (user?.id) {
      fetchClients();
    }
  }, [user]);

  // Fetch sequences, pending follow-ups, and stats
  useEffect(() => {
    async function fetchData() {
      if (!selectedClientId) return;

      setLoading(true);
      try {
        const [seqRes, pendingRes, statsRes] = await Promise.all([
          fetch(`/api/follow-ups/sequences/${selectedClientId}`),
          fetch(`/api/follow-ups/${selectedClientId}/pending`),
          fetch(`/api/follow-ups/${selectedClientId}/stats`),
        ]);

        const seqData = await seqRes.json();
        const pendingData = await pendingRes.json();
        const statsData = await statsRes.json();

        setSequences(seqData);
        setPendingFollowUps(pendingData);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching follow-up data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedClientId]);

  async function toggleSequenceStatus(
    sequenceId: string,
    currentStatus: string
  ) {
    const newStatus = currentStatus === "active" ? "paused" : "active";

    try {
      await fetch(`/api/follow-ups/sequences/${sequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Refresh sequences
      setSequences(
        sequences.map((seq) =>
          seq.id === sequenceId ? { ...seq, status: newStatus } : seq
        )
      );
    } catch (error) {
      console.error("Error toggling sequence:", error);
    }
  }

  async function deleteSequence(sequenceId: string) {
    if (!confirm("Are you sure you want to delete this sequence?")) return;

    try {
      await fetch(`/api/follow-ups/sequences/${sequenceId}`, {
        method: "DELETE",
      });

      setSequences(sequences.filter((seq) => seq.id !== sequenceId));
    } catch (error) {
      console.error("Error deleting sequence:", error);
    }
  }

  async function cancelFollowUp(followUpId: string) {
    try {
      await fetch(`/api/follow-ups/${followUpId}`, {
        method: "DELETE",
      });

      setPendingFollowUps(
        pendingFollowUps.filter((fu) => fu.id !== followUpId)
      );
    } catch (error) {
      console.error("Error cancelling follow-up:", error);
    }
  }

  function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading follow-ups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground">
            Automated message sequences to nurture leads
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Client Selector */}
          {clients.length > 1 && (
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Sequence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateSequenceForm
                clientId={selectedClientId}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  // Refresh sequences
                  window.location.reload();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Follow-ups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">
                {stats.pending}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {stats.sent}
              </div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">
                {stats.failed}
              </div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {stats.cancelled}
              </div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sequences */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sequences created yet</p>
              <Button
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create Your First Sequence
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sequences.map((sequence) => (
                <Card key={sequence.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">
                            {sequence.name}
                          </h3>
                          {sequence.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                          <Badge
                            variant={
                              sequence.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {sequence.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {sequence.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {sequence.steps.length} steps
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {sequence.channel}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleSequenceStatus(sequence.id, sequence.status)
                          }
                        >
                          {sequence.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSequence(sequence.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Steps Preview */}
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      {sequence.steps.map((step) => (
                        <div key={step.id} className="text-sm">
                          <div className="font-medium text-muted-foreground mb-1">
                            Step {step.stepNumber} • After{" "}
                            {formatDelay(step.delayMinutes)}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {step.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Follow-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Follow-ups
            {pendingFollowUps.length > 0 && (
              <Badge variant="secondary">{pendingFollowUps.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingFollowUps.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending follow-ups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFollowUps.map((followUp) => (
                <Card key={followUp.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {followUp.leadName}
                          {followUp.leadCompany && (
                            <span className="text-muted-foreground">
                              {" "}
                              • {followUp.leadCompany}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {followUp.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(followUp.scheduledFor).toLocaleString()}
                          </span>
                          <span>Step {followUp.stepNumber}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelFollowUp(followUp.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Create Sequence Form Component
function CreateSequenceForm({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("no_response");

  // ✅ FIX: Explicitly type the steps array
  type StepInput = { delayMinutes: number; content: string };
  const [steps, setSteps] = useState<StepInput[]>([
    { delayMinutes: 30, content: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function addStep() {
    setSteps([...steps, { delayMinutes: 360, content: "" }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: keyof StepInput,
    value: number | string
  ) {
    const newSteps = [...steps];
    if (field === "delayMinutes") {
      newSteps[index][field] = value as number;
    } else {
      newSteps[index][field] = value as string;
    }
    setSteps(newSteps);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/follow-ups/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          description,
          triggerType,
          channel: "whatsapp",
          steps: steps.map((step, i) => ({
            stepNumber: i + 1,
            delayMinutes: step.delayMinutes,
            content: step.content,
            channel: "whatsapp",
          })),
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating sequence:", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create Follow-up Sequence</DialogTitle>
      </DialogHeader>

      <div>
        <Label>Sequence Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., 48-Hour Fast Lane"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of when to use this sequence"
        />
      </div>

      <div>
        <Label>Trigger Type</Label>
        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no_response">No Response</SelectItem>
            <SelectItem value="time_based">Time Based</SelectItem>
            <SelectItem value="behavior">Behavior Triggered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Follow-up Steps</Label>
          <Button type="button" size="sm" variant="outline" onClick={addStep}>
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>

        {steps.map((step, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Step {index + 1}</Label>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs">Delay (minutes)</Label>
                <Input
                  type="number"
                  value={step.delayMinutes}
                  onChange={(e) =>
                    updateStep(index, "delayMinutes", parseInt(e.target.value))
                  }
                  min="1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  30 min = 30, 6 hrs = 360, 24 hrs = 1440
                </p>
              </div>

              <div>
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={step.content}
                  onChange={(e) => updateStep(index, "content", e.target.value)}
                  placeholder="Use {{firstName}}, {{lastName}}, {{company}} for variables"
                  required
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Sequence"}
        </Button>
      </div>
    </form>
  );
}
