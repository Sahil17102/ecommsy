import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

interface Props {
  file: File;
  onRemove: () => void;
}

export function PendingFileChip({ file, onRemove }: Props) {
  const [thumb, setThumb] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  if (isImage && thumb) {
    return (
      <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border-light bg-background group">
        <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 inline-flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background border border-border-light text-xs text-foreground max-w-[220px]">
      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="truncate">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 text-muted hover:text-foreground shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
