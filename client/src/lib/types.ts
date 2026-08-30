export type Role = "customer" | "agent" | "admin";
export type TicketStatus = "new" | "assigned" | "in_progress" | "resolved";
export type Priority = "Low" | "Medium" | "High";
export type Category =
  | "Billing"
  | "Technical"
  | "Account"
  | "Shipping"
  | "Product"
  | "General";

export const CATEGORIES: Category[] = [
  "Billing",
  "Technical",
  "Account",
  "Shipping",
  "Product",
  "General",
];
export const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  expertise?: string[];
  avatarColor?: string;
  phone?: string;
  company?: string;
  location?: string;
  bio?: string;
  createdAt?: string;
}

export interface UserRef {
  id: string;
  name: string;
  role: Role;
  avatarColor?: string;
  email?: string;
  expertise?: string[];
}

export interface AiSuggestion {
  category: Category | null;
  priority: Priority | null;
  summary: string;
  suggestedResponse: string;
  sentiment: string;
  provider: string;
  reviewed: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  error?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customer: UserRef | null;
  assignedAgent: UserRef | null;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  aiSuggestion: AiSuggestion | null;
  resolutionNote: string;
  resolutionSummary: string;
  resolvedAt: string | null;
  reopened: boolean;
  reopenedAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export type MessageKind = "message" | "system" | "note";

export interface TicketMessage {
  id: string;
  ticket?: string;
  sender: { id: string | null; name: string; role: Role | "system" };
  content: string;
  type: MessageKind;
  createdAt: string;
}

export interface Stats {
  total: number;
  new: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  open: number;
  today: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  leaderboard?: { agent: string; resolved: number }[];
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function statusChipClass(status: TicketStatus) {
  return `sf-status-chip sf-status-${status}`;
}

export function priorityChipClass(priority: Priority) {
  return `sf-priority sf-priority-${priority.toLowerCase()}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
