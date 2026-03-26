export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  route: string;
  method: string;
  status: number;
  error_type: string | null;
  duration_ms: number;
  message: string;
}

export function log(entry: Omit<LogEntry, "timestamp">): void {
  const record: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(record));
}