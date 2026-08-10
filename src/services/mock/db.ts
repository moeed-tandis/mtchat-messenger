import type {
  AuditLog,
  Connection,
  Contact,
  Conversation,
  Message,
  MessageLog,
  Notification,
  RoutingRule,
  SecurityLog,
  SystemLog,
  User,
} from "@/types";

/**
 * In-memory mock database.
 * This file is the ONLY place with fake data. Replace the service layer
 * implementations (src/services/api/*) with real HTTP calls to drop it.
 */

const now = new Date();

function iso(minutesAgo: number) {
  return new Date(now.getTime() - minutesAgo * 60_000).toISOString();
}
function daysAgo(d: number) {
  return new Date(now.getTime() - d * 86_400_000).toISOString();
}

export const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export interface MockCredential {
  username: string;
  password: string;
  userId: string;
}

export const users: User[] = [
  {
    id: "u_admin",
    fullName: "معید (مدیر ارشد)",
    username: "moeed",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    lastLoginAt: iso(12),
    createdAt: daysAgo(240),
  },
  {
    id: "u_ali",
    fullName: "علی احمدی",
    username: "ali",
    role: "AGENT",
    status: "ACTIVE",
    lastLoginAt: iso(35),
    createdAt: daysAgo(120),
  },
  {
    id: "u_reza",
    fullName: "رضا محمدی",
    username: "reza",
    role: "AGENT",
    status: "ACTIVE",
    lastLoginAt: iso(180),
    createdAt: daysAgo(96),
  },
  {
    id: "u_mehdi",
    fullName: "مهدی کریمی",
    username: "mehdi",
    role: "AGENT",
    status: "ACTIVE",
    lastLoginAt: daysAgo(2),
    createdAt: daysAgo(60),
  },
  {
    id: "u_sara",
    fullName: "سارا نوری",
    username: "sara",
    role: "AGENT",
    status: "DISABLED",
    lastLoginAt: daysAgo(18),
    createdAt: daysAgo(58),
  },
];

export const credentials: MockCredential[] = [
  { username: "moeed", password: "Modern@35043", userId: "u_admin" },
  { username: "ali", password: "ali123", userId: "u_ali" },
  { username: "reza", password: "reza123", userId: "u_reza" },
  { username: "mehdi", password: "mehdi123", userId: "u_mehdi" },
  { username: "sara", password: "sara123", userId: "u_sara" },
];

export const contacts: Contact[] = [
  {
    id: "c_1",
    rubikaId: "rbk_8f21a",
    name: "محمد رضایی",
    phone: "09017068432",
    firstContactAt: daysAgo(34),
    lastContactAt: iso(8),
    assignedUserId: "u_ali",
    lastActiveAgentId: "u_ali",
    tags: ["پشتیبانی", "مشتری ویژه"],
    notes: [
      {
        id: "n_1",
        authorId: "u_ali",
        body: "مشتری قدیمی، سفارش شماره ۱۹۴۲ را پیگیری می‌کند.",
        createdAt: iso(120),
      },
    ],
    conversationCount: 4,
    lastMessagePreview: "سلام، وقتتون بخیر. پیگیری سفارش داشتم.",
  },
  {
    id: "c_2",
    rubikaId: "rbk_2c77e",
    name: "علی محمدی",
    phone: "09945319843",
    firstContactAt: daysAgo(21),
    lastContactAt: iso(26),
    assignedUserId: "u_ali",
    lastActiveAgentId: "u_ali",
    tags: ["فروش"],
    notes: [],
    conversationCount: 2,
    lastMessagePreview: "ممنون از راهنماییتون.",
  },
  {
    id: "c_3",
    rubikaId: "rbk_5b019",
    name: "رضا کریمی",
    phone: "09121234567",
    firstContactAt: daysAgo(12),
    lastContactAt: iso(74),
    assignedUserId: "u_reza",
    lastActiveAgentId: "u_reza",
    tags: ["فنی"],
    notes: [
      {
        id: "n_2",
        authorId: "u_reza",
        body: "مشکل ورود به پنل داشت، با تغییر رمز حل شد.",
        createdAt: daysAgo(3),
      },
    ],
    conversationCount: 3,
    lastMessagePreview: "پنل برام باز نمیشه.",
  },
  {
    id: "c_4",
    rubikaId: "rbk_9de44",
    name: "مهدی احمدی",
    phone: "09361122334",
    firstContactAt: daysAgo(9),
    lastContactAt: iso(210),
    assignedUserId: "u_mehdi",
    lastActiveAgentId: "u_mehdi",
    tags: [],
    notes: [],
    conversationCount: 1,
    lastMessagePreview: "هزینه اشتراک سالانه چقدره؟",
  },
  {
    id: "c_5",
    rubikaId: "rbk_71cc2",
    name: "زهرا موسوی",
    phone: "09193344556",
    firstContactAt: daysAgo(5),
    lastContactAt: iso(420),
    assignedUserId: "u_reza",
    lastActiveAgentId: "u_reza",
    tags: ["مالی"],
    notes: [],
    conversationCount: 2,
    lastMessagePreview: "فاکتور رسمی نیاز دارم.",
  },
  {
    id: "c_6",
    rubikaId: "rbk_33af0",
    name: "حسین نجفی",
    phone: "09055566778",
    firstContactAt: daysAgo(3),
    lastContactAt: daysAgo(1),
    assignedUserId: null,
    lastActiveAgentId: null,
    tags: [],
    notes: [],
    conversationCount: 1,
    lastMessagePreview: "سلام، امکان همکاری هست؟",
  },
];

export const conversations: Conversation[] = [
  {
    id: "cv_1",
    contactId: "c_1",
    assignedUserId: "u_ali",
    status: "OPEN",
    unreadCount: 2,
    lastMessageAt: iso(8),
    lastMessagePreview: "سلام، وقتتون بخیر. پیگیری سفارش داشتم.",
    createdAt: iso(90),
  },
  {
    id: "cv_2",
    contactId: "c_2",
    assignedUserId: "u_ali",
    status: "OPEN",
    unreadCount: 0,
    lastMessageAt: iso(26),
    lastMessagePreview: "ممنون از راهنماییتون.",
    createdAt: iso(300),
  },
  {
    id: "cv_3",
    contactId: "c_3",
    assignedUserId: "u_reza",
    status: "PENDING",
    unreadCount: 1,
    lastMessageAt: iso(74),
    lastMessagePreview: "پنل برام باز نمیشه.",
    createdAt: iso(600),
  },
  {
    id: "cv_4",
    contactId: "c_4",
    assignedUserId: "u_mehdi",
    status: "OPEN",
    unreadCount: 0,
    lastMessageAt: iso(210),
    lastMessagePreview: "هزینه اشتراک سالانه چقدره؟",
    createdAt: iso(900),
  },
  {
    id: "cv_5",
    contactId: "c_5",
    assignedUserId: "u_reza",
    status: "CLOSED",
    unreadCount: 0,
    lastMessageAt: iso(420),
    lastMessagePreview: "فاکتور رسمی نیاز دارم.",
    createdAt: daysAgo(4),
  },
  {
    id: "cv_6",
    contactId: "c_6",
    assignedUserId: null,
    status: "OPEN",
    unreadCount: 1,
    lastMessageAt: daysAgo(1),
    lastMessagePreview: "سلام، امکان همکاری هست؟",
    createdAt: daysAgo(1),
  },
];

export const messages: Message[] = [
  // cv_1
  {
    id: "m_1",
    conversationId: "cv_1",
    direction: "INBOUND",
    type: "text",
    text: "سلام وقت بخیر",
    status: "READ",
    createdAt: iso(90),
  },
  {
    id: "m_2",
    conversationId: "cv_1",
    direction: "OUTBOUND",
    type: "text",
    text: "سلام، در خدمتم. بفرمایید.",
    authorUserId: "u_ali",
    status: "READ",
    createdAt: iso(86),
  },
  {
    id: "m_3",
    conversationId: "cv_1",
    direction: "INBOUND",
    type: "text",
    text: "سفارش شماره ۱۹۴۲ رو ثبت کردم ولی وضعیتش تغییر نکرده.",
    status: "READ",
    createdAt: iso(40),
  },
  {
    id: "m_4",
    conversationId: "cv_1",
    direction: "OUTBOUND",
    type: "text",
    text: "بررسی می‌کنم و همین امروز نتیجه را اطلاع می‌دهم.",
    authorUserId: "u_ali",
    status: "DELIVERED",
    createdAt: iso(30),
  },
  {
    id: "m_5",
    conversationId: "cv_1",
    direction: "INBOUND",
    type: "text",
    text: "ممنون. اگر ممکنه امروز پاسخ بدید.",
    status: "SENT",
    createdAt: iso(10),
  },
  {
    id: "m_6",
    conversationId: "cv_1",
    direction: "INBOUND",
    type: "text",
    text: "سلام، وقتتون بخیر. پیگیری سفارش داشتم.",
    status: "SENT",
    createdAt: iso(8),
  },
  // cv_2
  {
    id: "m_7",
    conversationId: "cv_2",
    direction: "INBOUND",
    type: "text",
    text: "برای تمدید اشتراک چطور اقدام کنم؟",
    status: "READ",
    createdAt: iso(120),
  },
  {
    id: "m_8",
    conversationId: "cv_2",
    direction: "OUTBOUND",
    type: "text",
    text: "از بخش اشتراک‌ها گزینه تمدید را انتخاب کنید. اگر مشکلی بود اطلاع دهید.",
    authorUserId: "u_ali",
    status: "READ",
    createdAt: iso(110),
  },
  {
    id: "m_9",
    conversationId: "cv_2",
    direction: "INBOUND",
    type: "text",
    text: "ممنون از راهنماییتون.",
    status: "READ",
    createdAt: iso(26),
  },
  // cv_3
  {
    id: "m_10",
    conversationId: "cv_3",
    direction: "INBOUND",
    type: "text",
    text: "پنل برام باز نمیشه.",
    status: "SENT",
    createdAt: iso(74),
  },
  {
    id: "m_11",
    conversationId: "cv_3",
    direction: "OUTBOUND",
    type: "text",
    text: "لطفاً یک بار از حساب خارج شوید و مجدد وارد شوید.",
    authorUserId: "u_reza",
    status: "FAILED",
    createdAt: iso(70),
  },
  // cv_4
  {
    id: "m_12",
    conversationId: "cv_4",
    direction: "INBOUND",
    type: "text",
    text: "هزینه اشتراک سالانه چقدره؟",
    status: "READ",
    createdAt: iso(210),
  },
  {
    id: "m_13",
    conversationId: "cv_4",
    direction: "OUTBOUND",
    type: "text",
    text: "اشتراک سالانه با ۲۰٪ تخفیف محاسبه می‌شود. جزئیات را ارسال می‌کنم.",
    authorUserId: "u_mehdi",
    status: "READ",
    createdAt: iso(200),
  },
  // cv_5
  {
    id: "m_14",
    conversationId: "cv_5",
    direction: "INBOUND",
    type: "text",
    text: "فاکتور رسمی نیاز دارم.",
    status: "READ",
    createdAt: iso(430),
  },
  {
    id: "m_15",
    conversationId: "cv_5",
    direction: "OUTBOUND",
    type: "text",
    text: "فاکتور رسمی صادر و ارسال شد. در صورت نیاز اطلاع دهید.",
    authorUserId: "u_reza",
    status: "READ",
    createdAt: iso(420),
  },
  // cv_6
  {
    id: "m_16",
    conversationId: "cv_6",
    direction: "INBOUND",
    type: "text",
    text: "سلام، امکان همکاری هست؟",
    status: "SENT",
    createdAt: daysAgo(1),
  },
];

export const routingRules: RoutingRule[] = [
  { id: "r_1", phone: "09017068432", userId: "u_ali", createdAt: daysAgo(30) },
  { id: "r_2", phone: "09945319843", userId: "u_ali", createdAt: daysAgo(20) },
  { id: "r_3", phone: "09121234567", userId: "u_reza", createdAt: daysAgo(12) },
  { id: "r_4", phone: "09361122334", userId: "u_mehdi", createdAt: daysAgo(8) },
];

export const connections: Connection[] = [
  {
    id: "conn_rubika",
    name: "Rubika",
    provider: "rubika",
    status: "CONNECTED",
    lastMessageAt: iso(8),
    inboundCount: 1842,
    outboundCount: 1223,
  },
];

export const systemLogs: SystemLog[] = [
  { id: "sl_1", createdAt: iso(3), level: "INFO", service: "Messaging", event: "پیام دریافت شد", status: "موفق" },
  { id: "sl_2", createdAt: iso(9), level: "INFO", service: "API", event: "درخواست ارسال پیام", status: "موفق" },
  { id: "sl_3", createdAt: iso(22), level: "WARNING", service: "Messaging", event: "تاخیر در تحویل پیام", status: "هشدار" },
  { id: "sl_4", createdAt: iso(48), level: "ERROR", service: "Messaging", event: "ارسال پیام ناموفق", status: "ناموفق" },
  { id: "sl_5", createdAt: iso(75), level: "INFO", service: "Auth", event: "ورود کاربر", status: "موفق" },
  { id: "sl_6", createdAt: iso(140), level: "INFO", service: "Database", event: "پشتیبان‌گیری روزانه", status: "موفق" },
  { id: "sl_7", createdAt: iso(260), level: "WARNING", service: "API", event: "محدودیت نرخ درخواست", status: "هشدار" },
  { id: "sl_8", createdAt: iso(430), level: "INFO", service: "Server", event: "راه‌اندازی سرویس", status: "موفق" },
];

export const messageLogs: MessageLog[] = [
  {
    id: "ml_1",
    messageId: "m_6",
    conversationId: "cv_1",
    contactName: "محمد رضایی",
    direction: "INBOUND",
    status: "SUCCESS",
    createdAt: iso(8),
    payload: {
      externalMessageId: "rubika-msg-91021",
      contact: { id: "rbk_8f21a", phone: "09017068432", name: "محمد رضایی" },
      message: { type: "text", text: "سلام، وقتتون بخیر. پیگیری سفارش داشتم.", timestamp: iso(8) },
    },
  },
  {
    id: "ml_2",
    messageId: "m_4",
    conversationId: "cv_1",
    contactName: "محمد رضایی",
    direction: "OUTBOUND",
    status: "SUCCESS",
    createdAt: iso(30),
    payload: {
      conversationId: "cv_1",
      contactId: "rbk_8f21a",
      text: "بررسی می‌کنم و همین امروز نتیجه را اطلاع می‌دهم.",
    },
  },
  {
    id: "ml_3",
    messageId: "m_11",
    conversationId: "cv_3",
    contactName: "رضا کریمی",
    direction: "OUTBOUND",
    status: "FAILED",
    createdAt: iso(70),
    payload: {
      conversationId: "cv_3",
      contactId: "rbk_5b019",
      text: "لطفاً یک بار از حساب خارج شوید و مجدد وارد شوید.",
      error: "upstream_timeout",
    },
  },
  {
    id: "ml_4",
    messageId: "m_10",
    conversationId: "cv_3",
    contactName: "رضا کریمی",
    direction: "INBOUND",
    status: "SUCCESS",
    createdAt: iso(74),
    payload: {
      externalMessageId: "rubika-msg-90887",
      contact: { id: "rbk_5b019", phone: "09121234567", name: "رضا کریمی" },
      message: { type: "text", text: "پنل برام باز نمیشه.", timestamp: iso(74) },
    },
  },
  {
    id: "ml_5",
    messageId: "m_16",
    conversationId: "cv_6",
    contactName: "حسین نجفی",
    direction: "INBOUND",
    status: "PENDING",
    createdAt: daysAgo(1),
    payload: {
      externalMessageId: "rubika-msg-90112",
      contact: { id: "rbk_33af0", phone: "09055566778", name: "حسین نجفی" },
      message: { type: "text", text: "سلام، امکان همکاری هست؟", timestamp: daysAgo(1) },
    },
  },
];

export const auditLogs: AuditLog[] = [
  { id: "al_1", userId: "u_ali", userName: "علی احمدی", action: "وارد سیستم شد", createdAt: iso(35), ip: "192.168.1.24" },
  { id: "al_2", userId: "u_reza", userName: "رضا محمدی", action: "گفتگو را بست", createdAt: iso(60), ip: "192.168.1.31" },
  { id: "al_3", userId: "u_admin", userName: "مدیر سیستم", action: "کاربر جدید ایجاد کرد", createdAt: iso(140), ip: "10.0.0.5" },
  { id: "al_4", userId: "u_ali", userName: "علی احمدی", action: "پیام ارسال کرد", createdAt: iso(30), ip: "192.168.1.24" },
  { id: "al_5", userId: "u_mehdi", userName: "مهدی کریمی", action: "گفتگو را به انتظار منتقل کرد", createdAt: iso(240), ip: "192.168.1.77" },
  { id: "al_6", userId: "u_admin", userName: "مدیر سیستم", action: "قانون مسیریابی را ویرایش کرد", createdAt: iso(320), ip: "10.0.0.5" },
];

export const securityLogs: SecurityLog[] = [
  { id: "sec_1", event: "LOGIN_SUCCESS", userName: "علی احمدی", createdAt: iso(35), ip: "192.168.1.24", detail: "ورود موفق" },
  { id: "sec_2", event: "LOGIN_FAILED", userName: "sara", createdAt: iso(90), ip: "5.22.14.9", detail: "رمز عبور نامعتبر" },
  { id: "sec_3", event: "ACCOUNT_DISABLED", userName: "سارا نوری", createdAt: daysAgo(18), ip: "10.0.0.5", detail: "غیرفعال‌سازی توسط مدیر" },
  { id: "sec_4", event: "PASSWORD_CHANGED", userName: "رضا محمدی", createdAt: daysAgo(6), ip: "10.0.0.5", detail: "بازنشانی رمز توسط مدیر" },
  { id: "sec_5", event: "LOGOUT", userName: "مهدی کریمی", createdAt: daysAgo(2), ip: "192.168.1.77", detail: "خروج از حساب" },
  { id: "sec_6", event: "PERMISSION_CHANGED", userName: "علی احمدی", createdAt: daysAgo(9), ip: "10.0.0.5", detail: "اجازه اختصاص گفتگو فعال شد" },
];

export const notifications: Notification[] = [
  {
    id: "nt_1",
    title: "پیام جدید از محمد رضایی",
    body: "سلام، وقتتون بخیر. پیگیری سفارش داشتم.",
    createdAt: iso(8),
    read: false,
    conversationId: "cv_1",
  },
  {
    id: "nt_2",
    title: "گفتگوی جدید",
    body: "حسین نجفی یک گفتگوی جدید آغاز کرد.",
    createdAt: daysAgo(1),
    read: false,
    conversationId: "cv_6",
  },
  {
    id: "nt_3",
    title: "گفتگو به شما اختصاص داده شد",
    body: "گفتگوی رضا کریمی به شما اختصاص یافت.",
    createdAt: iso(74),
    read: true,
    conversationId: "cv_3",
  },
];

export const activitySeries = [
  { label: "شنبه", inbound: 182, outbound: 141 },
  { label: "یکشنبه", inbound: 214, outbound: 176 },
  { label: "دوشنبه", inbound: 268, outbound: 209 },
  { label: "سه‌شنبه", inbound: 231, outbound: 188 },
  { label: "چهارشنبه", inbound: 302, outbound: 246 },
  { label: "پنجشنبه", inbound: 276, outbound: 231 },
  { label: "جمعه", inbound: 158, outbound: 122 },
];
