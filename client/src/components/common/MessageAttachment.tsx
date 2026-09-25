import { useEffect, useState } from "react";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  path: string;
  name: string;
  contentType: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageAttachment({ path, name, contentType, size }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isImage = contentType.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setLoading(true);
    setError(false);
    api
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(res.data as Blob);
        setBlobUrl(currentUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [path]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border-light text-xs text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading {name}…
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border-light text-xs text-muted">
        <FileText className="w-3.5 h-3.5" />
        {name} (unavailable)
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={blobUrl} target="_blank" rel="noreferrer" className="block max-w-[240px]">
        <img
          src={blobUrl}
          alt={name}
          className="rounded-lg border border-border-light max-h-[200px] w-auto"
        />
        <span className="block text-[10px] text-muted mt-1 truncate">{name}</span>
      </a>
    );
  }

  return (
    <a
      href={blobUrl}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border-light text-xs text-foreground hover:border-primary/40 no-underline"
    >
      {contentType.startsWith("image/") ? (
        <ImageIcon className="w-3.5 h-3.5 text-primary" />
      ) : (
        <FileText className="w-3.5 h-3.5 text-primary" />
      )}
      <span className="truncate max-w-[180px]">{name}</span>
      <span className="text-muted">· {formatSize(size)}</span>
    </a>
  );
}
