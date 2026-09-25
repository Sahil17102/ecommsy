import { useState, type ReactNode } from "react";
import { Table, Spin, Pagination, Dropdown } from "antd";
import type { TableProps, MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * Extended column type that adds mobile-specific hints.
 *
 * - `mobileTitle`: renders as the card header (defaults to first column)
 * - `mobileHidden`: skip this column in card view
 * - `mobileActions`: marks this column as the action column for mobile cards
 * - `mobileMenu`: function returning Dropdown menu items for the three-dot menu
 *    If provided, renders a proper labeled Dropdown on mobile.
 */
export interface ResponsiveColumn {
  mobileTitle?: boolean;
  mobileHidden?: boolean;
  mobileActions?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mobileMenu?: (record: any, index: number) => MenuProps["items"];
}

export type ResponsiveColumnsType<T> = (ColumnsType<T>[number] & ResponsiveColumn)[];

interface ResponsiveTableProps<T> extends Omit<TableProps<T>, "columns"> {
  columns: ResponsiveColumnsType<T>;
  /** Optional fully-custom mobile card renderer. If provided, auto-card is skipped. */
  mobileCard?: (record: T, index: number) => ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ResponsiveTable<T extends Record<string, any>>({
  columns,
  mobileCard,
  dataSource,
  loading,
  pagination: paginationProp,
  locale,
  onRow,
  rowKey,
  expandable,
  ...rest
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  // ── Desktop: render normal themed table ──
  // Apply default page-size options when pagination is provided
  const desktopPagination = paginationProp && typeof paginationProp === "object"
    ? {
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100", "500"],
        ...paginationProp,
      }
    : paginationProp;

  if (!isMobile) {
    return (
      <div className="themed-table rounded-xl border border-border-light overflow-hidden bg-background-elevated overflow-x-auto">
        <Table
          columns={columns as ColumnsType<T>}
          dataSource={dataSource}
          loading={loading}
          pagination={desktopPagination}
          locale={locale}
          onRow={onRow}
          rowKey={rowKey}
          expandable={expandable}
          {...rest}
        />
      </div>
    );
  }

  // ── Mobile: render cards ──
  const data = (dataSource ?? []) as T[];
  const isLoading = loading === true || (typeof loading === "object" && loading?.spinning);

  // Resolve which columns fill which role
  const titleCol = columns.find((c) => c.mobileTitle) ?? columns[0];
  const actionCol =
    columns.find((c) => c.mobileActions) ??
    columns.find((c) => c.key === "actions") ??
    columns.find((c) => c.key === "toggle");
  const bodyColumns = columns.filter(
    (c) => c !== titleCol && c !== actionCol && !c.mobileHidden,
  );

  function getRowKey(record: T, index: number): string {
    if (typeof rowKey === "function") return String(rowKey(record));
    if (typeof rowKey === "string") return String(record[rowKey]);
    return String(index);
  }

  function renderCell(col: ColumnsType<T>[number], record: T, index: number): ReactNode {
    if ("render" in col && col.render) {
      const dataIndex = "dataIndex" in col ? col.dataIndex : undefined;
      const value = dataIndex ? record[dataIndex as string] : undefined;
      const result = col.render(value, record, index);
      if (result && typeof result === "object" && "children" in result && !("type" in result)) {
        return (result as { children: ReactNode }).children;
      }
      return result as ReactNode;
    }
    if ("dataIndex" in col && col.dataIndex) {
      return String(record[col.dataIndex as string] ?? "—");
    }
    return null;
  }

  const paginationConfig =
    paginationProp && typeof paginationProp === "object" ? paginationProp : null;

  const hasExpandable = expandable && "expandedRowRender" in expandable;

  const totalCount = paginationConfig?.total ?? data.length;
  const pageSize = paginationConfig?.pageSize ?? 10;
  const currentPage = paginationConfig?.current ?? 1;
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-2.5">
      {/* ── Mobile list header ── */}
      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted">
            {`${rangeStart}–${rangeEnd} of ${totalCount}`}
          </span>
          {paginationConfig && paginationConfig.current && paginationConfig.pageSize && (
            <span className="text-[11px] text-muted/60">
              Page {paginationConfig.current} of {Math.ceil(totalCount / (paginationConfig.pageSize ?? 10))}
            </span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}

      {!isLoading && data.length === 0 && (
        <div className="text-center py-12 text-sm text-muted">
          {(locale as { emptyText?: string })?.emptyText ?? "No data"}
        </div>
      )}

      {!isLoading &&
        data.map((record, index) => {
          if (mobileCard) {
            return <div key={getRowKey(record, index)}>{mobileCard(record, index)}</div>;
          }
          return (
            <MobileCard
              key={getRowKey(record, index)}
              record={record}
              index={index}
              titleCol={titleCol}
              actionCol={actionCol}
              bodyColumns={bodyColumns}
              renderCell={renderCell}
              onRow={onRow}
              expandable={hasExpandable ? expandable : undefined}
            />
          );
        })}

      {paginationConfig && paginationConfig.total !== undefined && paginationConfig.total > 0 && (
        <div className="flex justify-center pt-2 pb-1">
          <Pagination
            size="small"
            current={paginationConfig.current}
            pageSize={paginationConfig.pageSize}
            total={paginationConfig.total}
            onChange={paginationConfig.onChange}
            showSizeChanger={false}
            simple
          />
        </div>
      )}
    </div>
  );
}

/* ── Mobile card sub-component (keeps expand state per card) ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MobileCard<T extends Record<string, any>>({
  record,
  index,
  titleCol,
  actionCol,
  bodyColumns,
  renderCell,
  onRow,
  expandable,
}: {
  record: T;
  index: number;
  titleCol: ResponsiveColumnsType<T>[number];
  actionCol: ResponsiveColumnsType<T>[number] | undefined;
  bodyColumns: ResponsiveColumnsType<T>;
  renderCell: (col: ColumnsType<T>[number], record: T, index: number) => ReactNode;
  onRow: TableProps<T>["onRow"];
  expandable: TableProps<T>["expandable"];
}) {
  const [expanded, setExpanded] = useState(false);
  const rowProps = onRow?.(record, index);
  const onClick = rowProps?.onClick as ((e: React.MouseEvent) => void) | undefined;

  // Build menu items from mobileMenu if provided
  const menuItems = actionCol?.mobileMenu?.(record, index);
  const hasMenu = menuItems && menuItems.length > 0;

  return (
    <div
      className={`rounded-xl border border-border-light bg-background-elevated shadow-sm overflow-hidden ${rowProps?.className ?? ""}`}
      style={rowProps?.style}
    >
      {/* ── Card header ── */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2.5 bg-surface-muted/40 border-b border-border-light/60 ${onClick ? "cursor-pointer active:bg-primary-bg" : ""}`}
        onClick={onClick}
      >
        <div className="min-w-0 flex-1">
          {renderCell(titleCol, record, index)}
        </div>

        {hasMenu && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
              <button
                type="button"
                className="p-1.5 -mr-1 rounded-lg text-muted hover:text-foreground hover:bg-background-elevated transition-colors"
              >
                <EllipsisVertical size={16} />
              </button>
            </Dropdown>
          </div>
        )}
      </div>

      {/* ── Card body: label/value pairs ── */}
      {bodyColumns.length > 0 && (
        <div
          className={`px-3.5 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 ${onClick ? "cursor-pointer active:bg-primary-bg" : ""}`}
          onClick={onClick}
        >
          {bodyColumns.map((col) => {
            const cell = renderCell(col, record, index);
            if (!cell) return null;
            return (
              <div
                key={String(col.key ?? ("dataIndex" in col ? col.dataIndex : ""))}
                className="min-w-0"
              >
                {col.title && typeof col.title === "string" && (
                  <span className="text-[10px] uppercase tracking-wide text-foreground font-semibold block mb-0.5">
                    {col.title}
                  </span>
                )}
                <div className="text-xs text-foreground">{cell}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expandable section ── */}
      {expandable && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border-light/60 text-xs font-medium text-primary hover:bg-primary-bg/50 transition-colors"
          >
            {expanded ? "Hide details" : "View details"}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          {expanded && expandable.expandedRowRender && (
            <div className="px-3.5 pb-3 border-t border-border-light/60 bg-surface-muted">
              {expandable.expandedRowRender(record, index, 0, expanded)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
