-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN','AGENT');
CREATE TYPE public.user_status AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE public.conversation_status AS ENUM ('OPEN','PENDING','CLOSED');
CREATE TYPE public.message_direction AS ENUM ('INBOUND','OUTBOUND');
CREATE TYPE public.message_status AS ENUM ('PENDING','SENT','DELIVERED','READ','FAILED');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  username text NOT NULL UNIQUE,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  avatar_color text NOT NULL DEFAULT 'blue',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN');
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "profiles admin insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "profiles admin delete" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY "roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- ============ contacts ============
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubika_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  username text,
  phone text NOT NULL DEFAULT '',
  avatar_url text,
  first_contact_at timestamptz NOT NULL DEFAULT now(),
  last_contact_at timestamptz NOT NULL DEFAULT now(),
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_active_agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  conversation_count integer NOT NULL DEFAULT 0,
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.conversation_status NOT NULL DEFAULT 'OPEN',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND c.assigned_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_contact(_contact_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.contact_id = _contact_id AND c.assigned_user_id = auth.uid()
  );
$$;

CREATE POLICY "contacts visible to owner or admin" ON public.contacts
  FOR SELECT TO authenticated USING (public.can_access_contact(id) OR assigned_user_id = auth.uid());
CREATE POLICY "contacts admin write" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "contacts update owner or admin" ON public.contacts
  FOR UPDATE TO authenticated USING (public.can_access_contact(id) OR assigned_user_id = auth.uid())
  WITH CHECK (public.can_access_contact(id) OR assigned_user_id = auth.uid());
CREATE POLICY "contacts admin delete" ON public.contacts
  FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY "conversations visible to owner or admin" ON public.conversations
  FOR SELECT TO authenticated USING (public.is_super_admin() OR assigned_user_id = auth.uid());
CREATE POLICY "conversations admin insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "conversations update owner or admin" ON public.conversations
  FOR UPDATE TO authenticated USING (public.is_super_admin() OR assigned_user_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR assigned_user_id = auth.uid());
CREATE POLICY "conversations admin delete" ON public.conversations
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ============ messages ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  external_message_id text,
  direction public.message_direction NOT NULL,
  type text NOT NULL DEFAULT 'text',
  text text NOT NULL DEFAULT '',
  file_name text,
  file_url text,
  author_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.message_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages visible to conversation owner" ON public.messages
  FOR SELECT TO authenticated USING (public.can_access_conversation(conversation_id));
CREATE POLICY "messages insert by conversation owner" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (public.can_access_conversation(conversation_id));
CREATE POLICY "messages update by conversation owner" ON public.messages
  FOR UPDATE TO authenticated USING (public.can_access_conversation(conversation_id))
  WITH CHECK (public.can_access_conversation(conversation_id));
CREATE POLICY "messages admin delete" ON public.messages
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ============ contact notes ============
CREATE TABLE public.contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_notes TO authenticated;
GRANT ALL ON public.contact_notes TO service_role;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes visible to contact owner" ON public.contact_notes
  FOR SELECT TO authenticated USING (public.can_access_contact(contact_id));
CREATE POLICY "notes insert by contact owner" ON public.contact_notes
  FOR INSERT TO authenticated WITH CHECK (public.can_access_contact(contact_id) AND author_id = auth.uid());
CREATE POLICY "notes delete by author or admin" ON public.contact_notes
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_super_admin());

-- ============ routing rules ============
CREATE TABLE public.routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routing_rules TO authenticated;
GRANT ALL ON public.routing_rules TO service_role;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routing readable by authenticated" ON public.routing_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "routing admin manage" ON public.routing_rules
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ settings ============
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin manage" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.app_settings (key, value) VALUES
  ('routing', '{"strategy":"LEAST_LOADED","fallbackUserId":null,"autoAssign":true}'::jsonb),
  ('general', '{"appName":"MTchat","notificationsEnabled":true,"retentionDays":180}'::jsonb);

-- ============ logs ============
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'INFO',
  service text NOT NULL DEFAULT 'app',
  event text NOT NULL,
  status text NOT NULL DEFAULT 'OK',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid,
  conversation_id uuid,
  contact_name text NOT NULL DEFAULT '',
  direction public.message_direction NOT NULL,
  status text NOT NULL DEFAULT 'SUCCESS',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_logs, public.message_logs, public.audit_logs, public.security_logs TO authenticated;
GRANT ALL ON public.system_logs, public.message_logs, public.audit_logs, public.security_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system logs admin read" ON public.system_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "message logs admin read" ON public.message_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "audit logs admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "security logs admin read" ON public.security_logs FOR SELECT TO authenticated USING (public.is_super_admin());

-- ============ rubika bridge ============
CREATE TABLE public.bridge_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state text NOT NULL DEFAULT 'OFFLINE',
  guid text,
  phone text,
  error text,
  last_heartbeat_at timestamptz,
  chats jsonb NOT NULL DEFAULT '[]'::jsonb,
  inbound_count integer NOT NULL DEFAULT 0,
  outbound_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.bridge_state (id) VALUES (1);
GRANT SELECT ON public.bridge_state TO authenticated;
GRANT ALL ON public.bridge_state TO service_role;
ALTER TABLE public.bridge_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bridge state readable by authenticated" ON public.bridge_state
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bridge_outbox (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  chat_guid text,
  text text,
  command_type text,
  command_value text,
  status text NOT NULL DEFAULT 'QUEUED',
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
GRANT SELECT ON public.bridge_outbox TO authenticated;
GRANT ALL ON public.bridge_outbox TO service_role;
ALTER TABLE public.bridge_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outbox admin read" ON public.bridge_outbox
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- ============ realtime ============
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.bridge_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bridge_state;