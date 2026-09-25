import { useState, useEffect } from "react";
import { Select, Spin, type SelectProps } from "antd";
import { useDebounce } from "@/hooks/useDebounce";

export interface AsyncSelectProps
  extends Omit<SelectProps, "onSearch" | "filterOption" | "showSearch"> {
  /** Called with the debounced search string */
  onAsyncSearch: (search: string) => void;
  /** Debounce delay in ms (default 400) */
  debounceMs?: number;
  /** Message when search is empty */
  emptyPrompt?: string;
  /** Message when search yields no results */
  noResultsText?: string;
}

/**
 * Async Select with built-in debounced search.
 * Wraps Ant Design Select with `showSearch`, `filterOption={false}`,
 * debounced `onSearch`, and sensible `notFoundContent` defaults.
 */
export default function AsyncSelect({
  onAsyncSearch,
  debounceMs = 400,
  emptyPrompt = "Type to search...",
  noResultsText = "No results found",
  loading,
  notFoundContent,
  value,
  ...selectProps
}: AsyncSelectProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, debounceMs);

  useEffect(() => {
    onAsyncSearch(debouncedSearch);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ant Design only shows placeholder when value is undefined/null, not ""
  const normalizedValue = value === "" ? undefined : value;

  const defaultNotFound = loading ? (
    <div className="flex items-center justify-center gap-2 py-2">
      <Spin size="small" />
      <span className="text-xs text-muted">Searching...</span>
    </div>
  ) : search ? (
    noResultsText
  ) : (
    emptyPrompt
  );

  return (
    <Select
      {...selectProps}
      value={normalizedValue}
      loading={loading}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      notFoundContent={notFoundContent ?? defaultNotFound}
    />
  );
}
