// Display formats for figures that sit in tables: fixed shapes, so columns can be sized to them.

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// "Sep 30, 2026", in UTC so the server and the browser agree.
export function formatDate(value: number | string | null): string {
  if (value === null) return "Never";
  return DATE.format(new Date(value));
}

// "3.4 MB". Sizes in tables are rough; one decimal is plenty.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
