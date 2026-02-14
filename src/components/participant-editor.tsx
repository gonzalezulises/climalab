"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { parseParticipantsWithAI } from "@/actions/ai-participants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Mail,
  MailWarning,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { ParticipantWithStatus } from "@/actions/participants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ParticipantEntry = { name: string; email: string; department?: string };

type Props = {
  participants: ParticipantWithStatus[];
  departments: string[];
  campaignStatus: string;
  baseUrl: string;
  onAdd: (entries: ParticipantEntry[]) => Promise<{ added: number; skipped: number } | null>;
  onEdit: (participantId: string, data: ParticipantEntry) => Promise<boolean>;
  onRemove: (participantId: string) => Promise<boolean>;
  onSendInvitations: (participantIds: string[]) => Promise<{ sent: number; failed: number } | null>;
  onResend: (participantId: string) => Promise<boolean>;
};

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------
function parseCSV(text: string): ParticipantEntry[] {
  const results: ParticipantEntry[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const name = parts[0];
    const email = parts[1];
    if (!name || !email || !email.includes("@")) continue;

    results.push({
      name,
      email: email.toLowerCase(),
      ...(parts[2]?.trim() ? { department: parts[2].trim() } : {}),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------
const INVITATION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "outline" },
  sent: { label: "Enviada", variant: "default" },
  delivered: { label: "Entregada", variant: "default" },
  bounced: { label: "Rebotada", variant: "destructive" },
  failed: { label: "Fallida", variant: "destructive" },
};

const SURVEY_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "outline" },
  in_progress: { label: "En progreso", variant: "secondary" },
  completed: { label: "Completado", variant: "default" },
  disqualified: { label: "Descalificado", variant: "destructive" },
};

// ---------------------------------------------------------------------------
// Department selector (reused in add row and edit row)
// ---------------------------------------------------------------------------
function DeptField({
  value,
  onChange,
  departments,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: string[];
  className?: string;
}) {
  if (departments.length > 0) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Departamento"
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ParticipantEditor({
  participants,
  departments,
  campaignStatus,
  baseUrl,
  onAdd,
  onEdit,
  onRemove,
  onSendInvitations,
  onResend,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDept, setEditDept] = useState("");
  const [saving, setSaving] = useState(false);

  const isDraft = campaignStatus === "draft";
  const canEdit = isDraft || campaignStatus === "active";

  // ---------------------------------------------------------------------------
  // Inline edit handlers
  // ---------------------------------------------------------------------------
  function startEdit(p: ParticipantWithStatus) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditDept(p.department ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(participantId: string) {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Nombre y email válido son requeridos");
      return;
    }
    setSaving(true);
    const ok = await onEdit(participantId, {
      name: trimmedName,
      email: trimmedEmail,
      ...(editDept ? { department: editDept } : {}),
    });
    if (ok) {
      toast.success("Participante actualizado");
      setEditingId(null);
    }
    setSaving(false);
  }

  // ---------------------------------------------------------------------------
  // Add / Import handlers
  // ---------------------------------------------------------------------------
  async function handleAddSingle() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Nombre y email válido son requeridos");
      return;
    }

    setLoading(true);
    const result = await onAdd([
      { name: trimmedName, email: trimmedEmail, ...(dept ? { department: dept } : {}) },
    ]);
    if (result) {
      if (result.added > 0) {
        toast.success("Participante agregado");
        setName("");
        setEmail("");
        setDept("");
      } else {
        toast.error("Este email ya está registrado en la campaña");
      }
    }
    setLoading(false);
  }

  async function handleBulkAdd(entries: ParticipantEntry[]) {
    if (entries.length === 0) {
      toast.error("No se encontraron participantes válidos");
      return;
    }

    setLoading(true);
    const result = await onAdd(entries);
    if (result) {
      const msgs: string[] = [];
      if (result.added > 0) msgs.push(`${result.added} agregados`);
      if (result.skipped > 0) msgs.push(`${result.skipped} duplicados omitidos`);
      toast.success(msgs.join(", "));
      setImportText("");
      setShowImport(false);
    }
    setLoading(false);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target?.result as string);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleAIParse() {
    if (!importText.trim()) return;
    setAiParsing(true);
    const result = await parseParticipantsWithAI(importText);
    if (result.success) {
      if (result.data.length === 0) {
        toast.error("No se encontraron participantes en el texto");
      } else {
        await handleBulkAdd(result.data);
      }
    } else {
      toast.error(result.error);
    }
    setAiParsing(false);
  }

  async function handleSendAll() {
    const pending = participants.filter(
      (p) => p.invitation_status === "pending" || p.invitation_status === "failed"
    );
    if (pending.length === 0) {
      toast.error("No hay invitaciones pendientes");
      return;
    }
    setSendingAll(true);
    const result = await onSendInvitations(pending.map((p) => p.id));
    if (result) {
      const msgs: string[] = [];
      if (result.sent > 0) msgs.push(`${result.sent} enviadas`);
      if (result.failed > 0) msgs.push(`${result.failed} fallidas`);
      toast.success(msgs.join(", "));
    }
    setSendingAll(false);
  }

  async function handleResendToUnanswered() {
    const unanswered = participants.filter(
      (p) =>
        (p.invitation_status === "sent" || p.invitation_status === "delivered") &&
        p.respondent_status === "pending"
    );
    if (unanswered.length === 0) {
      toast.error("No hay participantes sin responder con invitación enviada");
      return;
    }
    setSendingAll(true);
    const result = await onSendInvitations(unanswered.map((p) => p.id));
    if (result) {
      toast.success(`${result.sent} recordatorios enviados`);
    }
    setSendingAll(false);
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/survey/${token}`);
    toast.success("Enlace copiado");
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const pendingInvitations = participants.filter((p) => p.invitation_status === "pending" || p.invitation_status === "failed").length;
  const sentCount = participants.filter((p) => p.invitation_status === "sent" || p.invitation_status === "delivered").length;
  const completedCount = participants.filter((p) => p.respondent_status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Manual add */}
      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSingle(); } }}
            placeholder="Nombre"
            className="flex-1"
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSingle(); } }}
            placeholder="Email"
            type="email"
            className="flex-1"
          />
          <DeptField value={dept} onChange={setDept} departments={departments} className="w-40" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddSingle}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Import section */}
      {canEdit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImport(!showImport)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar datos
              {showImport ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={handleCSVUpload}
            />
          </div>

          {showImport && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pega o sube tu lista de participantes</p>
                <button
                  type="button"
                  onClick={() => setShowExample(!showExample)}
                  className="text-xs text-muted-foreground underline"
                >
                  {showExample ? "Ocultar ejemplo" : "Ver ejemplo"}
                </button>
              </div>

              {showExample && (
                <div className="rounded border bg-muted/50 p-3 text-xs font-mono space-y-1">
                  <p className="text-muted-foreground mb-2 font-sans text-xs">
                    Formato CSV (nombre, email, departamento):
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs h-8">Nombre</TableHead>
                        <TableHead className="text-xs h-8">Email</TableHead>
                        <TableHead className="text-xs h-8">Depto.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-1">María García</TableCell>
                        <TableCell className="py-1">maria@empresa.com</TableCell>
                        <TableCell className="py-1">Ventas</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-1">Juan López</TableCell>
                        <TableCell className="py-1">juan@empresa.com</TableCell>
                        <TableCell className="py-1">IT</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-muted-foreground mt-2 font-sans">
                    Con la IA puedes pegar cualquier formato: tablas de Excel,
                    listas de correo, texto libre, etc.
                  </p>
                </div>
              )}

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={5}
                placeholder={"María García, maria@empresa.com, Ventas\nJuan López, juan@empresa.com, IT\n\nO pega cualquier texto y usa la IA..."}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Subir CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAdd(parseCSV(importText))}
                  disabled={!importText.trim() || loading}
                >
                  Parsear CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAIParse}
                  disabled={!importText.trim() || aiParsing}
                >
                  {aiParsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {aiParsing ? "Procesando..." : "Parsear con IA"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk actions bar */}
      {participants.length > 0 && canEdit && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">
            {participants.length} participante{participants.length !== 1 ? "s" : ""}
            {sentCount > 0 && <> &middot; {sentCount} invitados</>}
            {completedCount > 0 && <> &middot; {completedCount} completados</>}
          </p>
          <div className="flex gap-2">
            {pendingInvitations > 0 && (
              <Button
                size="sm"
                onClick={handleSendAll}
                disabled={sendingAll}
              >
                {sendingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sendingAll ? "Enviando..." : `Enviar invitaciones (${pendingInvitations})`}
              </Button>
            )}
            {sentCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResendToUnanswered}
                disabled={sendingAll}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reenviar a no respondidos
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Participant table */}
      {participants.length > 0 ? (
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Invitación</TableHead>
                <TableHead>Encuesta</TableHead>
                <TableHead className="w-28">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => {
                const invInfo = INVITATION_LABELS[p.invitation_status] ?? INVITATION_LABELS.pending;
                const surveyInfo = p.respondent_status
                  ? SURVEY_LABELS[p.respondent_status] ?? SURVEY_LABELS.pending
                  : null;
                const isEditing = editingId === p.id;

                if (isEditing) {
                  return (
                    <TableRow key={p.id} className="bg-muted/30">
                      <TableCell>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(p.id); } if (e.key === "Escape") cancelEdit(); }}
                          className="h-8"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(p.id); } if (e.key === "Escape") cancelEdit(); }}
                          type="email"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <DeptField value={editDept} onChange={setEditDept} departments={departments} className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Badge variant={invInfo.variant}>{invInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {surveyInfo ? (
                          <Badge variant={surveyInfo.variant}>{surveyInfo.label}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Guardar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={invInfo.variant}>{invInfo.label}</Badge>
                      {p.reminder_count > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (+{p.reminder_count})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {surveyInfo ? (
                        <Badge variant={surveyInfo.variant}>{surveyInfo.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Copy link */}
                        {p.respondent_token && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => copyLink(p.respondent_token!)}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar enlace</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Resend */}
                        {canEdit && p.invitation_status !== "pending" && p.respondent_status !== "completed" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={async () => {
                                  setResendingId(p.id);
                                  const ok = await onResend(p.id);
                                  if (ok) toast.success(`Recordatorio enviado a ${p.name}`);
                                  setResendingId(null);
                                }}
                                disabled={resendingId === p.id}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                {resendingId === p.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MailWarning className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Reenviar invitación</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Remove (draft only) */}
                        {isDraft && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={async () => {
                                  setRemovingId(p.id);
                                  await onRemove(p.id);
                                  setRemovingId(null);
                                }}
                                disabled={removingId === p.id}
                                className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                              >
                                {removingId === p.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar participante</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      ) : (
        <div className="text-center py-8">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No hay participantes registrados. Agrega participantes manualmente o importa una lista.
          </p>
        </div>
      )}
    </div>
  );
}
