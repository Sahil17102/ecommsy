import { Modal, Button } from "antd";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  mime?: string;
}

export function DocumentPreviewModal({
  open,
  onClose,
  url,
  title,
  mime,
}: DocumentPreviewModalProps) {
  const isImage = mime?.startsWith("image/");
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <Modal
      open={open}
      onCancel={() => {
        setFullscreen(false);
        onClose();
      }}
      title={
        <div className="flex items-center justify-between pr-8">
          <span>{title}</span>
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-1 rounded hover:bg-primary-bg transition-colors text-muted hover:text-foreground"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      }
      width={fullscreen ? "95vw" : 720}
      centered
      destroyOnClose
      footer={
        <a href={url} download>
          <Button icon={<Download size={14} />}>Download</Button>
        </a>
      }
      styles={{
        body: { padding: 0 },
        content: fullscreen ? { maxHeight: "95vh" } : undefined,
      }}
    >
      <div className="flex items-center justify-center bg-surface-muted rounded-b-lg min-h-[300px] p-2">
        {isImage ? (
          <img
            src={url}
            alt={title}
            className="max-w-full max-h-[65vh] object-contain rounded"
            style={fullscreen ? { maxHeight: "80vh" } : undefined}
          />
        ) : (
          <iframe
            src={url}
            title={title}
            className="w-full rounded border-0"
            style={{ height: fullscreen ? "80vh" : "65vh" }}
          />
        )}
      </div>
    </Modal>
  );
}
