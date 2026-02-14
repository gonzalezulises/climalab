"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function LogoUpload({
  orgId,
  currentUrl,
  onLogoChange,
}: {
  orgId: string;
  currentUrl: string | null;
  onLogoChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG, SVG o WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("El archivo excede 2 MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${orgId}/logo.${ext}`;

    // Remove existing files in the org folder first
    const { data: existingFiles } = await supabase.storage.from("org-assets").list(orgId);
    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from("org-assets")
        .remove(existingFiles.map((f) => `${orgId}/${f.name}`));
    }

    const { error: uploadError } = await supabase.storage
      .from("org-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("org-assets").getPublicUrl(path);

    onLogoChange(publicUrl);
    setUploading(false);
  }

  async function handleDelete() {
    setError(null);
    setUploading(true);

    const { data: existingFiles } = await supabase.storage.from("org-assets").list(orgId);
    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from("org-assets")
        .remove(existingFiles.map((f) => `${orgId}/${f.name}`));
    }

    onLogoChange(null);
    setUploading(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Logo de la organización</label>

      {currentUrl ? (
        <div className="flex items-center gap-4">
          <img
            src={currentUrl}
            alt="Logo"
            className="h-16 w-auto max-w-[200px] rounded border object-contain bg-white p-1"
          />
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={uploading}>
            <Trash2 className="mr-1 h-3 w-3" />
            Eliminar
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50"
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {uploading ? "Subiendo..." : "Arrastra una imagen o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground/70">PNG, JPG, SVG o WebP. Máx 2 MB.</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
