export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      bridge_outbox: {
        Row: {
          chat_guid: string | null
          command_type: string | null
          command_value: string | null
          created_at: string
          delivered_at: string | null
          id: number
          kind: string
          status: string
          text: string | null
        }
        Insert: {
          chat_guid?: string | null
          command_type?: string | null
          command_value?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: number
          kind: string
          status?: string
          text?: string | null
        }
        Update: {
          chat_guid?: string | null
          command_type?: string | null
          command_value?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: number
          kind?: string
          status?: string
          text?: string | null
        }
        Relationships: []
      }
      bridge_state: {
        Row: {
          chats: Json
          error: string | null
          guid: string | null
          id: number
          inbound_count: number
          last_heartbeat_at: string | null
          outbound_count: number
          phone: string | null
          state: string
          updated_at: string
        }
        Insert: {
          chats?: Json
          error?: string | null
          guid?: string | null
          id?: number
          inbound_count?: number
          last_heartbeat_at?: string | null
          outbound_count?: number
          phone?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          chats?: Json
          error?: string | null
          guid?: string | null
          id?: number
          inbound_count?: number
          last_heartbeat_at?: string | null
          outbound_count?: number
          phone?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_notes: {
        Row: {
          author_id: string | null
          body: string
          contact_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          contact_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_user_id: string | null
          avatar_url: string | null
          conversation_count: number
          created_at: string
          first_contact_at: string
          id: string
          last_active_agent_id: string | null
          last_contact_at: string
          last_message_preview: string
          name: string
          phone: string
          rubika_id: string
          tags: string[]
          username: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          avatar_url?: string | null
          conversation_count?: number
          created_at?: string
          first_contact_at?: string
          id?: string
          last_active_agent_id?: string | null
          last_contact_at?: string
          last_message_preview?: string
          name?: string
          phone?: string
          rubika_id: string
          tags?: string[]
          username?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          avatar_url?: string | null
          conversation_count?: number
          created_at?: string
          first_contact_at?: string
          id?: string
          last_active_agent_id?: string | null
          last_contact_at?: string
          last_message_preview?: string
          name?: string
          phone?: string
          rubika_id?: string
          tags?: string[]
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_last_active_agent_id_fkey"
            columns: ["last_active_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_user_id: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count: number
        }
        Insert: {
          assigned_user_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
        }
        Update: {
          assigned_user_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          contact_name: string
          conversation_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          message_id: string | null
          payload: Json
          status: string
        }
        Insert: {
          contact_name?: string
          conversation_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          message_id?: string | null
          payload?: Json
          status?: string
        }
        Update: {
          contact_name?: string
          conversation_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          message_id?: string | null
          payload?: Json
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          author_user_id: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id: string | null
          file_name: string | null
          file_url: string | null
          id: string
          status: Database["public"]["Enums"]["message_status"]
          text: string
          type: string
        }
        Insert: {
          author_user_id?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["message_status"]
          text?: string
          type?: string
        }
        Update: {
          author_user_id?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          external_message_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["message_status"]
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          full_name: string
          id: string
          last_login_at: string | null
          status: Database["public"]["Enums"]["user_status"]
          username: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id: string
          last_login_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          username: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          username?: string
        }
        Relationships: []
      }
      routing_rules: {
        Row: {
          created_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          detail: string
          event: string
          id: string
          ip: string
          user_name: string
        }
        Insert: {
          created_at?: string
          detail?: string
          event: string
          id?: string
          ip?: string
          user_name?: string
        }
        Update: {
          created_at?: string
          detail?: string
          event?: string
          id?: string
          ip?: string
          user_name?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          level: string
          service: string
          status: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          level?: string
          service?: string
          status?: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          level?: string
          service?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_contact: { Args: { _contact_id: string }; Returns: boolean }
      can_access_conversation: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "SUPER_ADMIN" | "AGENT"
      conversation_status: "OPEN" | "PENDING" | "CLOSED"
      message_direction: "INBOUND" | "OUTBOUND"
      message_status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
      user_status: "ACTIVE" | "DISABLED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["SUPER_ADMIN", "AGENT"],
      conversation_status: ["OPEN", "PENDING", "CLOSED"],
      message_direction: ["INBOUND", "OUTBOUND"],
      message_status: ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"],
      user_status: ["ACTIVE", "DISABLED"],
    },
  },
} as const
