"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateItem } from "@/actions/instruments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import type { Item } from "@/types";

export function EditItemDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(item.text);
  const [isReverse, setIsReverse] = useState(item.is_reverse);
  const [isAnchor, setIsAnchor] = useState(item.is_anchor);
  const [isAttentionCheck, setIsAttentionCheck] = useState(item.is_attention_check);

  async function handleSubmit() {
    setLoading(true);

    const result = await updateItem({
      id: item.id,
      text,
      is_reverse: isReverse,
      is_anchor: isAnchor,
      is_attention_check: isAttentionCheck,
    });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Item actualizado exitosamente");
      setOpen(false);
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar ítem">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Texto del item</Label>
            <Input id="text" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isReverse}
                onChange={(e) => setIsReverse(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Item reverso</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAnchor}
                onChange={(e) => setIsAnchor(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Item ancla</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAttentionCheck}
                onChange={(e) => setIsAttentionCheck(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Verificacion de atencion</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
