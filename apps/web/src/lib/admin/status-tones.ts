export const EVENT_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  LIVE: "success",
  COMPLETED: "neutral",
  ARCHIVED: "neutral",
  CANCELLED: "danger",
};

export const BOOTH_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  OFFLINE: "neutral",
  ONLINE: "success",
  IDLE: "info",
  CAPTURING: "info",
  PRINTING: "info",
  ERROR: "danger",
  MAINTENANCE: "warning",
};

export const PRINT_JOB_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  QUEUED: "neutral",
  PRINTING: "info",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  RETRYING: "warning",
};
