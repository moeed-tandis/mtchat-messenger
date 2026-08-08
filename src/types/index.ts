// Core domain types for MTchat.
// These mirror the expected backend API contract.

export type Role = "SUPER_ADMIN" | "AGENT";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  avatarColor?: string;
}

export interface Contact {
  id: string; // internal id
  rubikaId: string; // external messaging platform id
  name: string;
  phone: string;
  firstContactAt: string;
  lastContactAt: string;
  assignedUserId: string | null;
  lastActiveAgentId: string | null;
  tags: string[];
  notes: ContactNote[];
  conversationCount: number;
  lastMessagePreview: string;
}

export interface ContactNote {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type ConversationStatus = "OPEN" | "PENDING" | "CLOSED";

export interface Conversation {
  id: string;
  contactId: string;
  assignedUserId: string | null;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  createdAt: string;
}

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
export type MessageType = "text" | "image" | "file" | "voice";

export interface Message {
  id: string;
  conversationId: string;
  externalMessageId?: string;
  direction: MessageDirection;
  type: MessageType;
  text: string;
  authorUserId?: string | null;
  status: MessageStatus;
  createdAt: string;
}

export interface RoutingRule {
  id: string;
  phone: string;
  userId: string;
  createdAt: string;
}

export type ConnectionStatus = "CONNECTED" | "DEGRADED" | "DISCONNECTED";

export interface Connection {
  id: string;
  name: string;
  provider: string;
  status: ConnectionStatus;
  lastMessageAt: string;
  inboundCount: number;
  outboundCount: number;
}

export type LogLevel = "INFO" | "WARNING" | "ERROR";

export interface SystemLog {
  id: string;
  createdAt: string;
  level: LogLevel;
  service: string;
  event: string;
  status: string;
}

export interface MessageLog {
  id: string;
  messageId: string;
  conversationId: string;
  contactName: string;
  direction: MessageDirection;
  status: "SUCCESS" | "PENDING" | "FAILED";
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  createdAt: string;
  ip: string;
}

export type SecurityEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "ACCOUNT_DISABLED"
  | "PASSWORD_CHANGED"
  | "PERMISSION_CHANGED";

export interface SecurityLog {
  id: string;
  event: SecurityEvent;
  userName: string;
  createdAt: string;
  ip: string;
  detail: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  openConversations: number;
  todayConversations: number;
  todayMessages: number;
  failedMessages: number;
}

export interface DashboardActivityPoint {
  label: string;
  inbound: number;
  outbound: number;
}

export interface SystemHealth {
  server: ConnectionStatus;
  database: ConnectionStatus;
  api: ConnectionStatus;
  messaging: ConnectionStatus;
}

export interface DashboardData {
  stats: DashboardStats;
  activity: DashboardActivityPoint[];
  recentConversations: Array<{
    conversationId: string;
    contactName: string;
    lastMessagePreview: string;
    assignedUserName: string;
    status: ConversationStatus;
    lastMessageAt: string;
  }>;
  recentActivity: AuditLog[];
  health: SystemHealth;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  conversationId?: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
