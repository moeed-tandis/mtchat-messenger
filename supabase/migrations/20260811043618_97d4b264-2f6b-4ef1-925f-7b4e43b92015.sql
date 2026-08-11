CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN');
$$;

CREATE OR REPLACE FUNCTION private.can_access_conversation(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND c.assigned_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_contact(_contact_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.contact_id = _contact_id AND c.assigned_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_conversation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_contact(uuid) TO authenticated, service_role;

ALTER POLICY "profiles self update" ON public.profiles
  USING (id = auth.uid() OR private.is_super_admin())
  WITH CHECK (id = auth.uid() OR private.is_super_admin());
ALTER POLICY "profiles admin insert" ON public.profiles WITH CHECK (private.is_super_admin());
ALTER POLICY "profiles admin delete" ON public.profiles USING (private.is_super_admin());

ALTER POLICY "contacts visible to owner or admin" ON public.contacts
  USING (private.can_access_contact(id) OR assigned_user_id = auth.uid());
ALTER POLICY "contacts admin write" ON public.contacts WITH CHECK (private.is_super_admin());
ALTER POLICY "contacts update owner or admin" ON public.contacts
  USING (private.can_access_contact(id) OR assigned_user_id = auth.uid())
  WITH CHECK (private.can_access_contact(id) OR assigned_user_id = auth.uid());
ALTER POLICY "contacts admin delete" ON public.contacts USING (private.is_super_admin());

ALTER POLICY "conversations visible to owner or admin" ON public.conversations
  USING (private.is_super_admin() OR assigned_user_id = auth.uid());
ALTER POLICY "conversations admin insert" ON public.conversations WITH CHECK (private.is_super_admin());
ALTER POLICY "conversations update owner or admin" ON public.conversations
  USING (private.is_super_admin() OR assigned_user_id = auth.uid())
  WITH CHECK (private.is_super_admin() OR assigned_user_id = auth.uid());
ALTER POLICY "conversations admin delete" ON public.conversations USING (private.is_super_admin());

ALTER POLICY "messages visible to conversation owner" ON public.messages
  USING (private.can_access_conversation(conversation_id));
ALTER POLICY "messages insert by conversation owner" ON public.messages
  WITH CHECK (private.can_access_conversation(conversation_id));
ALTER POLICY "messages update by conversation owner" ON public.messages
  USING (private.can_access_conversation(conversation_id))
  WITH CHECK (private.can_access_conversation(conversation_id));
ALTER POLICY "messages admin delete" ON public.messages USING (private.is_super_admin());

ALTER POLICY "notes visible to contact owner" ON public.contact_notes
  USING (private.can_access_contact(contact_id));
ALTER POLICY "notes insert by contact owner" ON public.contact_notes
  WITH CHECK (private.can_access_contact(contact_id) AND author_id = auth.uid());
ALTER POLICY "notes delete by author or admin" ON public.contact_notes
  USING (author_id = auth.uid() OR private.is_super_admin());

ALTER POLICY "routing admin manage" ON public.routing_rules
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());
ALTER POLICY "settings admin manage" ON public.app_settings
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

ALTER POLICY "system logs admin read" ON public.system_logs USING (private.is_super_admin());
ALTER POLICY "message logs admin read" ON public.message_logs USING (private.is_super_admin());
ALTER POLICY "audit logs admin read" ON public.audit_logs USING (private.is_super_admin());
ALTER POLICY "security logs admin read" ON public.security_logs USING (private.is_super_admin());
ALTER POLICY "outbox admin read" ON public.bridge_outbox USING (private.is_super_admin());

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.can_access_conversation(uuid);
DROP FUNCTION IF EXISTS public.can_access_contact(uuid);