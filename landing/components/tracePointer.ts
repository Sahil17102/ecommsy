import type { PointerEvent } from "react";

export function tracePointer(event: PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    "--trace-x",
    `${event.clientX - bounds.left}px`,
  );
  event.currentTarget.style.setProperty(
    "--trace-y",
    `${event.clientY - bounds.top}px`,
  );
}
