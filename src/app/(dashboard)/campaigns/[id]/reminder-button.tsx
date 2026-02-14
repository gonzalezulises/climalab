"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendReminders } from "@/actions/reminders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell } from "lucide-react";

export function ReminderButton({
  campaignId,
  pendingCount,
}: {
  campaignId: string;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    const result = await sendReminders(campaignId);

    if (result.success) {
      const { sent, skipped, failed } = result.data;
      toast.success(
        `Recordatorios enviados: ${sent}. Omitidos: ${skipped}.${failed > 0 ? ` Fallidos: ${failed}.` : ""}`
      );
    } else {
      toast.error(result.error);
    }

    setLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="mr-2 h-4 w-4" />
          Enviar recordatorios
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar recordatorios</DialogTitle>
          <DialogDescription>
            Se enviará un email de recordatorio a los {pendingCount} participantes que aún no han
            completado la encuesta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading || pendingCount === 0}>
            {loading
              ? "Enviando..."
              : `Enviar ${pendingCount} recordatorio${pendingCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
