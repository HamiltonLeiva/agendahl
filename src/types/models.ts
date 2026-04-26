export type TaskStatus = "pending" | "completed";

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  reminderMinutes: number[];
  status: TaskStatus;
  assigneeIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
  completedAt?: number;
}

export interface TaskDraft {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  reminderMinutes: number[];
  assigneeIds: string[];
}

export interface TaskFilters {
  query: string;
  status: "all" | TaskStatus;
  assigneeId: "all" | string;
}
