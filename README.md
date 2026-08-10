# MTchat Messenger

MTchat — Professional Messenger & Super Admin Panel

Build a complete, production-quality web application called MTchat.

MTchat is an internal messaging dashboard used by a team to receive and reply to messages coming from an external messaging platform.

The external messaging platform is Rubika.

IMPORTANT:

Do NOT implement the Rubika integration itself.

I will implement the Rubika → Server and Server → Rubika communication separately.

Your responsibility is to build the complete MTchat web application, UI/UX, authentication, user management, conversations, messaging interface, routing/assignment interface, logs, settings, dashboard, and API-ready architecture.

The Rubika integration must only be represented through a clean API/data interface so that I can connect my own backend later.

1. Product Goal

MTchat should feel like a professional customer-support messenger.

Think of the UX quality of:

Intercom

Zendesk

Crisp

modern WhatsApp Web

Telegram Web

Linear

modern SaaS admin dashboards

But MTchat must have its own identity.

The application must be:

Professional

Modern

Fast

Clean

Minimal

Responsive

RTL

Persian-first

Easy to use

Not unnecessarily complicated

Do NOT create an overly complicated enterprise UI.

The user should understand the application immediately.

2. Language

The main UI language is:

Persian / فارسی

The entire application must support RTL.

Use Persian labels throughout the interface.

Examples:

داشبورد
گفتگوها
پیام‌ها
کاربران
ارتباط‌ها
گزارش‌ها
لاگ سیستم
تنظیمات
پروفایل
خروج
جستجو
پیام جدید
ارسال
بستن گفتگو
اختصاص گفتگو

The architecture should still support English localization later.

3. User Roles

There are two primary roles.

SUPER ADMIN

The Super Admin controls the entire system.

Super Admin can:

Create users

Edit users

Disable users

Enable users

Reset passwords

View all users

View all conversations

View all contacts

Assign conversations

View system logs

View audit logs

View message logs

View system statistics

Manage connections

Manage routing

View system health

Configure settings

IMPORTANT:

There is NO public registration.

Users cannot register themselves.

Only Super Admin can create accounts.

AGENT / USER

Regular users can:

Login

View conversations assigned to them

Receive new messages

Reply to conversations

Search conversations

View contact information

Add notes

Change conversation status

Mark conversations as read

See their own activity

They must NOT access Super Admin pages.

4. Authentication

Create a professional login page.

Login:

نام کاربری
رمز عبور
ورود به MTchat

No public registration page.

No "Sign Up" button.

Only the Super Admin can create accounts.

After successful login:

SUPER ADMIN → Admin Dashboard

AGENT → Messenger Inbox

Include:

Session handling

Logout

Protected routes

Role-based access

Loading state

Invalid credentials state

Account disabled state

Session expired state

Do not expose passwords anywhere in the UI.

5. Main Application Layout

Create a modern SaaS layout.

Desktop:

┌─────────────────────────────────────────────────────────────┐
│                        Top Header                            │
├──────────────┬──────────────────────────┬───────────────────┤
│              │                          │                   │
│   Sidebar    │      Conversations       │ Contact Details   │
│              │                          │                   │
│              │                          │                   │
│              │          Chat            │                   │
│              │                          │                   │
│              │      Message Box         │                   │
│              │                          │                   │
└──────────────┴──────────────────────────┴───────────────────┘

On smaller screens:

Sidebar
   ↓
Conversation List
   ↓
Chat
   ↓
Contact Details

Use drawers/sheets on mobile.

6. Sidebar

Sidebar should be elegant and compact.

Top:

MTchat

Navigation for Agent:

💬 گفتگوها
👤 ارتباط‌ها

For Super Admin additionally:

📊 داشبورد
💬 گفتگوها
👥 کاربران
👤 ارتباط‌ها
🔀 مسیریابی
📋 لاگ‌ها
⚙️ تنظیمات

Bottom:

User Avatar
نام کاربر
نقش

Clicking the user opens:

پروفایل
خروج

7. Super Admin Dashboard

Create a professional dashboard.

Top statistic cards:

کل کاربران
کاربران فعال
گفتگوهای باز
گفتگوهای امروز
پیام‌های امروز
پیام‌های ناموفق

Example:

┌────────────┐ ┌────────────┐ ┌────────────┐
│ کاربران    │ │ گفتگوها    │ │ پیام‌ها    │
│ 24         │ │ 183        │ │ 2,481      │
└────────────┘ └────────────┘ └────────────┘

Then:

Activity Chart

Show:

پیام‌های دریافتی
پیام‌های ارسالی

over time.

Recent Conversations

Show:

مخاطب
آخرین پیام
کاربر مسئول
وضعیت
زمان

Recent Activity

Show:

کاربر X وارد شد
کاربر Y گفتگو را بست
Admin کاربر جدید ایجاد کرد
کاربر Z پاسخ ارسال کرد

System Status

Show:

سرور       ● فعال
Database   ● فعال
API        ● فعال
Messaging  ● متصل

These can initially use mock data / API-ready placeholders.

8. Agent Messenger

This is the most important part of MTchat.

The interface should feel like a professional messenger.

Three columns:

Left

Conversation list.

Center

Chat.

Right

Contact information.

9. Conversation List

Each conversation item:

Avatar
Contact Name
Phone / Rubika ID
Last Message
Time
Unread Count
Status

Example:

┌──────────────────────────────┐
│ 👤 محمد                     │
│ سلام، وقتتون بخیر...        │
│                    10:42     │
│                         2    │
└──────────────────────────────┘

Unread conversations should be visually obvious but not aggressive.

10. Conversation Filters

At the top:

همه
من
خوانده نشده
باز
در انتظار
بسته

Search:

جستجو در گفتگوها...

Search should support:

Contact name

Phone

Rubika ID

Message content

11. Chat Header

Show:

Avatar
Contact Name
Phone / Rubika ID
Online/Offline if available

Actions:

اختصاص
بستن گفتگو
بیشتر

12. Chat Messages

Create a beautiful modern message interface.

Incoming:

┌──────────────────────┐
│ سلام وقت بخیر        │
│ 10:42                │
└──────────────────────┘

Outgoing:

              ┌──────────────────────┐
              │ سلام، در خدمتم       │
              │ 10:44          ✓✓    │
              └──────────────────────┘

Support visually:

Text

Image placeholder

File placeholder

Voice placeholder

For now only text needs to be fully functional.

But the UI should be ready for media later.

13. Message Composer

Bottom of chat:

┌──────────────────────────────────────────────┐
│ پیام خود را بنویسید...                 📎  ➤ │
└──────────────────────────────────────────────┘

Features:

Send

Enter to send

Shift+Enter for new line

Attachment button

Disabled state

Sending state

Error state

When message is sent:

ارسال...
✓ ارسال شد

If backend reports failure:

ارسال ناموفق
تلاش مجدد

14. Contact Details

Right sidebar.

Show:

پروفایل مخاطب

نام
شماره
شناسه روبیکا

اولین ارتباط
آخرین ارتباط

کاربر مسئول
وضعیت گفتگو

برچسب‌ها

یادداشت‌ها

Example:

محمد رضایی

09017068432

آخرین ارتباط:
امروز، 10:42

کاربر مسئول:
علی احمدی

وضعیت:
باز

15. Important Routing Concept

The external Rubika account is centralized.

Multiple Rubika contacts can send messages to the same central account.

Example:

Rubika Contact A
09017068432
        ↓
MTchat User #2

and:

Rubika Contact B
09945319843
        ↓
MTchat User #2

The MTchat interface should represent this correctly.

Each Contact has an assigned Agent.

Important concept:

last_active_agent

If an Agent is the last person who interacted with a Contact, future incoming messages should normally remain assigned to that Agent.

Display this information in Contact Details and Assignment UI.

16. Assignment UI

When clicking:

اختصاص

open a clean dialog:

اختصاص گفتگو

کاربر فعلی:
علی احمدی

انتخاب کاربر:

[ جستجو ]

○ علی احمدی
○ رضا محمدی
○ مهدی کریمی

[ لغو ] [ ذخیره ]

Super Admin can reassign any conversation.

Agent can only perform reassignment if their permission allows it.

17. Conversation Status

Every conversation has:

OPEN
PENDING
CLOSED

Persian:

باز
در انتظار
بسته

Actions:

بستن گفتگو
باز کردن گفتگو
انتقال به انتظار

18. Contacts Page

Create a professional Contacts page.

Table:

نام
شماره
شناسه روبیکا
آخرین ارتباط
کاربر مسئول
تعداد گفتگو
آخرین پیام

Search and filters.

Clicking a contact opens:

Contact Profile
Conversation History
Notes
Assigned Agent

19. Users Management

Super Admin page:

مدیریت کاربران

Table:

نام
نام کاربری
نقش
وضعیت
آخرین ورود
تاریخ ایجاد
عملیات

Actions:

مشاهده
ویرایش
فعال/غیرفعال
تغییر رمز

20. Create User

Super Admin clicks:

+ ایجاد کاربر

Dialog:

ایجاد کاربر

نام و نام خانوادگی *
نام کاربری *
رمز عبور *
تکرار رمز عبور *

نقش:
Agent

وضعیت:
فعال

[ انصراف ] [ ایجاد کاربر ]

There is no self-registration.

Only Super Admin can create accounts.

21. User Profile

Show:

اطلاعات کاربر

نام
نام کاربری
نقش
وضعیت
آخرین ورود
تاریخ عضویت

Statistics:

گفتگوهای فعال
گفتگوهای بسته
پیام‌های ارسال شده
آخرین فعالیت

22. Disable User

When disabling:

Show confirmation modal:

غیرفعال کردن کاربر

آیا مطمئن هستید؟

این کاربر دیگر نمی‌تواند وارد MTchat شود.

[ انصراف ] [ غیرفعال کردن ]

Never delete data automatically.

Historical conversations and messages must remain.

23. Logs

Super Admin must have a dedicated Logs area.

Create tabs:

لاگ سیستم
لاگ پیام‌ها
لاگ فعالیت کاربران
لاگ امنیتی

24. System Logs

Table:

زمان
سطح
سرویس
رویداد
وضعیت

Levels:

INFO
WARNING
ERROR

Example:

10:42
INFO
Messaging
Message received
Success

25. Message Logs

Show:

Message ID
Conversation
Contact
Direction
Status
Time

Direction:

دریافتی
ارسالی

Status:

موفق
در انتظار
ناموفق

Clicking a log opens detailed information.

26. User Activity Logs

Show:

کاربر
عملیات
زمان
IP

Examples:

علی وارد سیستم شد
رضا گفتگو را بست
Admin کاربر جدید ایجاد کرد
علی پیام ارسال کرد

27. Security Logs

Super Admin should see:

Login Success
Login Failed
Logout
Account Disabled
Password Changed
Permission Changed

This section is only available to Super Admin.

28. Routing Management

Create a simple Routing page.

Do NOT make this overly complicated.

Show rules like:

مخاطب
→
کاربر MTchat

Example:

09017068432 → علی احمدی
09945319843 → علی احمدی
09121234567 → رضا محمدی

Actions:

ویرایش
حذف

Add Rule:

مخاطب:
[ 09017068432 ]

کاربر:
[ علی احمدی ]

[ ذخیره ]

Also support:

آخرین کاربر فعال

as the default routing behavior.

29. Connections Page

Create:

ارتباط‌ها

This represents external messaging connections.

Do not implement Rubika API.

Instead create an API-ready UI.

Example:

Rubika

وضعیت:
● متصل

آخرین پیام:
امروز 10:42

پیام‌های دریافتی:
1,842

پیام‌های ارسالی:
1,223

Buttons:

تست اتصال
بازخوانی وضعیت

These buttons can call placeholder endpoints.

30. Backend/API Contract

The UI must be designed to work with a backend later.

Create a clean API service layer.

Do NOT scatter fetch calls across components.

Use something like:

src/
  services/
    api/
      auth.ts
      users.ts
      conversations.ts
      contacts.ts
      messages.ts
      routing.ts
      logs.ts
      dashboard.ts
      connections.ts

All API communication must go through these services.

31. Mock API

During frontend development, use realistic mock data.

But make the mock layer replaceable.

Do NOT hardcode fake data directly inside UI components.

Use:

mock API
   ↓
service layer
   ↓
React components

Later I should be able to replace:

Mock API

with:

Real Backend API

without rewriting the UI.

32. Real-Time Architecture

Prepare the frontend for real-time messages.

Create an abstraction like:

RealtimeService

It should support future events:

message.created
message.updated
message.failed

conversation.created
conversation.updated
conversation.assigned

user.online
user.offline

For now, if no real WebSocket backend exists, use mock events.

33. Rubika Integration Boundary

VERY IMPORTANT:

Do not implement Rubika communication.

Create only the expected data contract.

Incoming:

{
  "externalMessageId": "rubika-message-id",
  "contact": {
    "id": "rubika-user-id",
    "phone": "09017068432",
    "name": "محمد"
  },
  "message": {
    "type": "text",
    "text": "سلام",
    "timestamp": "2026-08-08T10:42:00Z"
  }
}

Outgoing:

{
  "conversationId": "conversation-id",
  "contactId": "rubika-user-id",
  "text": "سلام، در خدمتم."
}

The actual Rubika implementation will be done separately.

34. Database/API Data Model

Design the frontend around these entities:

User
Contact
Conversation
Message
Assignment
RoutingRule
Connection
AuditLog
SystemLog
Notification

Relationships:

User
 └── Conversations

Contact
 └── Conversations

Conversation
 ├── Contact
 ├── Assigned User
 └── Messages

Message
 └── Conversation

35. Notifications

Create notification system.

Agent receives:

پیام جدید
گفتگوی جدید
گفتگو به شما اختصاص داده شد

Notification bell in header:

🔔 3

Click opens notification panel.

36. Unread System

Each Agent must see:

Unread Conversations
Unread Messages

Unread count should update when a new message arrives.

37. Search

Global search should be available.

Search:

نام مخاطب
شماره
شناسه روبیکا
متن پیام

Show grouped results:

مخاطبین
گفتگوها
پیام‌ها

38. Empty States

Every section must have a professional empty state.

Examples:

هنوز گفتگویی وجود ندارد.

هنوز کاربری ایجاد نشده است.

لاگی برای نمایش وجود ندارد.

مخاطبی پیدا نشد.

Do not leave blank screens.

39. Loading States

Use Skeleton UI.

Do not show ugly generic loading text everywhere.

For:

Conversation list

Messages

Tables

Dashboard cards

Contact details

use proper skeletons.

40. Error States

Create elegant error UI.

Example:

خطایی رخ داده است.

دریافت اطلاعات با مشکل مواجه شد.

[ تلاش مجدد ]

41. Toast Notifications

Use toast notifications.

Examples:

کاربر با موفقیت ایجاد شد.
گفتگو با موفقیت اختصاص داده شد.
پیام ارسال شد.
کاربر غیرفعال شد.

Errors:

ارسال پیام ناموفق بود.
لطفاً دوباره تلاش کنید.

42. Dark Mode

Support:

Light
Dark
System

Dark mode must be carefully designed.

Do not simply invert colors.

43. Design System

Create a consistent design system.

Use:

clean typography

moderate rounded corners

subtle borders

subtle shadows

good whitespace

modern icons

professional tables

clean cards

Avoid:

excessive gradients

giant cards

excessive animations

flashy colors

unnecessary glassmorphism

childish UI

The application should look like serious professional software.

44. Color System

Use a professional primary color.

Prefer a modern blue/indigo-based system.

Use semantic colors:

Success
Warning
Error
Info

Do not use too many colors.

45. Typography

Persian typography must be excellent.

Use a suitable Persian font such as:

Vazirmatn

or another high-quality Persian web font.

Text must remain readable in:

tables

chat

forms

dashboard

notifications

46. Responsive Design

The entire application must work on:

Desktop
Laptop
Tablet
Mobile

On mobile, do not force the 3-column layout.

Use navigation transitions:

Conversations
→
Chat
→
Contact

47. Performance

Optimize:

conversation list rendering

message list rendering

search

dashboard

large tables

Use pagination/infinite scrolling where appropriate.

Do not load thousands of messages at once.

48. Permissions

Frontend must respect permissions.

But remember:

Frontend permission checks are not security.

The backend will enforce authorization later.

The UI should hide unauthorized features from users.

Example:

Agent should not see:

مدیریت کاربران
لاگ امنیتی
تنظیمات سیستم

49. Important UX Rule

Keep the Agent workflow extremely simple:

Login
 ↓
Conversations
 ↓
Open Conversation
 ↓
Read Message
 ↓
Reply
 ↓
Done

Do NOT force Agents through multiple dialogs for normal messaging.

50. Super Admin Workflow

Super Admin workflow:

Login
 ↓
Dashboard
 ↓
Manage Users
 ↓
Create Agent
 ↓
View Conversations
 ↓
Monitor Activity
 ↓
View Logs
 ↓
Manage Routing

51. No Public Registration

This is mandatory.

Do not create:

ثبت نام
Sign Up
Create Account

for public users.

Only Super Admin can create accounts.

52. Demo Data

Create realistic Persian demo data.

For example:

Contacts:

محمد رضایی
علی محمدی
رضا کریمی
مهدی احمدی

Numbers:

09017068432
09945319843
09121234567

Agents:

علی احمدی
رضا محمدی
مهدی کریمی

Use realistic conversations.

Do NOT use Lorem Ipsum.

53. Important Message Routing Example

The UI should support this scenario:

Contact:

09017068432

sends:

سلام

Backend sends the message to MTchat.

MTchat determines:

Assigned Agent = علی احمدی

Agent sees:

پیام جدید از محمد

Agent replies:

سلام، در خدمتم.

Frontend calls:

POST /api/conversations/:id/messages

The backend will later forward that message to Rubika.

The frontend must not know how Rubika works.

54. API Endpoints Expected

Prepare the frontend for:

POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/dashboard

GET  /api/users
POST /api/users
GET  /api/users/:id
PATCH /api/users/:id
POST /api/users/:id/disable
POST /api/users/:id/reset-password

GET /api/contacts
GET /api/contacts/:id

GET /api/conversations
GET /api/conversations/:id
POST /api/conversations/:id/messages
PATCH /api/conversations/:id
POST /api/conversations/:id/assign
POST /api/conversations/:id/close
POST /api/conversations/:id/reopen

GET /api/routing-rules
POST /api/routing-rules
PATCH /api/routing-rules/:id
DELETE /api/routing-rules/:id

GET /api/logs
GET /api/audit-logs
GET /api/message-logs

GET /api/connections
GET /api/connections/:id/status
POST /api/connections/:id/test

55. Project Structure

Use a clean scalable structure.

Example:

src/
├── components/
│   ├── ui/
│   ├── chat/
│   ├── conversations/
│   ├── contacts/
│   ├── users/
│   ├── dashboard/
│   ├── logs/
│   └── layout/
│
├── pages/
│   ├── login
│   ├── dashboard
│   ├── conversations
│   ├── contacts
│   ├── users
│   ├── routing
│   ├── logs
│   ├── connections
│   └── settings
│
├── services/
│   ├── api/
│   ├── realtime/
│   └── mock/
│
├── hooks/
├── stores/
├── types/
├── utils/
└── config/

Adapt this structure to the framework Lovable generates.

56. Do Not Overengineer

This is extremely important.

Do NOT build:

microservices

Kubernetes

complicated event buses

complicated workflow builders

dozens of configuration pages

complicated permission matrices in UI

unnecessary enterprise features

The application should be:

Professional but simple.

The architecture should be clean enough to grow later.

57. What Lovable Must Actually Build

You must actually build the UI, not just describe it.

Build:

Login

Dashboard

Messenger

Conversations

Contacts

Users

Routing

Logs

Connections

Settings

Notifications

Profile

Responsive layouts

Dark mode

Loading states

Error states

Empty states

Modals

Forms

Tables

Search

Filters

All pages must be navigable.

All buttons should have meaningful behavior.

All forms should have validation.

All dialogs should work.

Use mock data where backend functionality is not available.

58. Backend Separation

Design the application so that the backend can later be connected without redesigning the frontend.

The frontend must not contain business logic such as:

How Rubika sends messages
How Rubika authenticates
How Rubika receives messages

Those belong to my backend.

The frontend only knows:

Contact
Conversation
Message
Agent
Assignment
Status

59. Final UX Quality

Before considering the project complete, verify:

Authentication

Login works

Logout works

Protected routes work

Role-based navigation works

No public registration

Messenger

Conversations work

Messages display correctly

Sending works through API abstraction

Unread count works

Search works

Filters work

Assignment works

Status works

Admin

User creation works

User editing works

User disabling works

Dashboard works

Logs work

Routing management works

Connection page works

UX

RTL works

Mobile works

Dark mode works

Loading states work

Error states work

Empty states work

Toasts work

60. Final Product Definition

MTchat is:

             MTchat
                │
     ┌──────────┴──────────┐
     │                     │
 Agent Workspace       Super Admin
     │                     │
     │                     ├── Users
     │                     ├── Logs
     │                     ├── Routing
     │                     ├── Connections
     │                     └── Dashboard
     │
     ├── Conversations
     ├── Messages
     ├── Contacts
     └── Assignments

External communication:

                    MTchat
                       │
                  REST API
                       │
                My Backend
                       │
                Rubika Adapter
                       │
                    Rubika

Lovable must build everything on the MTchat side.

I will implement:

Rubika → My Backend
My Backend → Rubika

Do not implement those parts.

FINAL INSTRUCTION

Start by building the complete MTchat interface and application.

Do not stop at wireframes.

Do not only generate static HTML.

Create a real interactive application with:

routing

authentication UI

role-aware navigation

messenger

conversation management

user management

logs

dashboard

contacts

routing

connection monitoring

notifications

responsive design

dark mode

mock API layer

The result should look like a premium, modern, production-ready SaaS messaging platform, while remaining simple enough for an Agent to use without training.

Prioritize:

UX > simplicity > reliability > clean architecture > visual polish.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a0073fd7-1a32-4979-9728-cb5c181e37e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
