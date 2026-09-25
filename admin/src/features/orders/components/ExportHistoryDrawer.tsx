import { Drawer, Button, Empty, Progress, Tag, Tooltip } from "antd";
import { Download, RefreshCw, AlertCircle, Clock, Loader2, CheckCircle2, Archive } from "lucide-react";
import dayjs from "dayjs";
import { useOrderExports, useDownloadExport, useRerunOrderExport } from "../queries";
import type { ExportJob, ExportJobStatus } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_META: Record<ExportJobStatus, { label: string; color: string; icon: typeof Clock }> = {
  queued: { label: "Queued", color: "default", icon: Clock },
  processing: { label: "Building", color: "processing", icon: Loader2 },
  completed: { label: "Ready", color: "success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "error", icon: AlertCircle },
  expired: { label: "Expired", color: "default", icon: Archive },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Turn the stored filter bag back into readable chips. */
function filterChips(filters: ExportJob["filters"]): string[] {
  if (!filters || Object.keys(filters).length === 0) return ["All orders"];
  const labels: Record<string, string> = {
    search: "Search",
    status: "Status",
    orderType: "Type",
    paymentType: "Payment",
    serviceProvider: "Provider",
    courierId: "Courier",
    userId: "Seller",
    startDate: "From",
    endDate: "To",
  };
  return Object.entries(filters).map(([key, value]) => {
    const label = labels[key] ?? key;
    const shown = key === "startDate" || key === "endDate" ? String(value).slice(0, 10) : String(value);
    // IDs are noise in a chip — show only that the filter was applied.
    const isId = key === "courierId" || key === "userId";
    return isId ? `${label}: selected` : `${label}: ${shown}`;
  });
}

function ExportRow({ job }: { job: ExportJob }) {
  const download = useDownloadExport();
  const rerun = useRerunOrderExport();
  const meta = STATUS_META[job.status] ?? STATUS_META.queued;
  const Icon = meta.icon;

  const percent =
    job.totalRows > 0 ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100)) : 0;
  const isActive = job.status === "queued" || job.status === "processing";
  // A completed job with fewer rows than matched means the safety cap kicked in.
  const capped = job.status === "completed" && job.totalRows > job.processedRows;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={13} className={job.status === "processing" ? "animate-spin text-muted" : "text-muted"} />
            <span className="text-sm font-medium text-foreground truncate">
              {job.fileName || "Orders export"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {dayjs(job.createdAt).format("DD MMM YYYY, hh:mm A")}
            {job.requestedByName ? ` · ${job.requestedByName}` : ""}
          </div>
        </div>
        <Tag color={meta.color} className="!m-0 shrink-0">{meta.label}</Tag>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {filterChips(job.filters).map((chip) => (
          <span
            key={chip}
            className="rounded bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted whitespace-nowrap"
          >
            {chip}
          </span>
        ))}
      </div>

      {isActive && (
        <div className="mt-2">
          <Progress
            percent={percent}
            size="small"
            status="active"
            format={() =>
              job.totalRows
                ? `${job.processedRows.toLocaleString()} / ${job.totalRows.toLocaleString()}`
                : "counting…"
            }
          />
        </div>
      )}

      {job.status === "completed" && (
        <div className="mt-2 text-[11px] text-muted">
          {job.processedRows.toLocaleString()} rows · {formatBytes(job.fileSize)}
          {capped && (
            <Tooltip title={`${job.totalRows.toLocaleString()} orders matched — the export is capped. Narrow the filters for the rest.`}>
              <span className="ml-1 text-violet-500">· capped</span>
            </Tooltip>
          )}
          {job.expiresAt && (
            <span> · available till {dayjs(job.expiresAt).format("DD MMM")}</span>
          )}
        </div>
      )}

      {job.status === "failed" && job.error && (
        <div className="mt-2 text-[11px] text-rose-400 break-words">{job.error}</div>
      )}

      {job.status === "expired" && (
        <div className="mt-2 text-[11px] text-muted">File cleaned up — re-run to rebuild it.</div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {job.status === "completed" && (
          <Button
            size="small"
            type="primary"
            loading={download.isPending}
            onClick={() => download.mutate({ id: job.id, fileName: job.fileName })}
            icon={<Download size={12} />}
          >
            Download
          </Button>
        )}
        {!isActive && (
          <Button
            size="small"
            variant="outlined"
            loading={rerun.isPending}
            onClick={() => rerun.mutate(job.id)}
            icon={<RefreshCw size={12} />}
          >
            Re-run
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Side panel listing every queued/finished orders export. Polls itself while
 * anything is still building, so a long export reports progress instead of
 * leaving the admin guessing.
 */
export default function ExportHistoryDrawer({ open, onClose }: Props) {
  const { data, isLoading } = useOrderExports(open, { limit: 20 });
  const jobs = data?.jobs ?? [];

  return (
    <Drawer
      title="Export history"
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-muted">
        Exports are built in the background — you can close this panel and come back.
        Files are kept for 7 days.
      </p>

      {isLoading && jobs.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted">Loading…</div>
      ) : jobs.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No exports yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <ExportRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </Drawer>
  );
}
