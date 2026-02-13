export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campaign_results: {
        Row: {
          avg_score: number | null
          calculated_at: string
          campaign_id: string
          dimension_code: string | null
          favorability_pct: number | null
          id: string
          metadata: Json | null
          respondent_count: number | null
          response_count: number | null
          result_type: string
          segment_key: string | null
          segment_type: string | null
          std_score: number | null
        }
        Insert: {
          avg_score?: number | null
          calculated_at?: string
          campaign_id: string
          dimension_code?: string | null
          favorability_pct?: number | null
          id?: string
          metadata?: Json | null
          respondent_count?: number | null
          response_count?: number | null
          result_type: string
          segment_key?: string | null
          segment_type?: string | null
          std_score?: number | null
        }
        Update: {
          avg_score?: number | null
          calculated_at?: string
          campaign_id?: string
          dimension_code?: string | null
          favorability_pct?: number | null
          id?: string
          metadata?: Json | null
          respondent_count?: number | null
          response_count?: number | null
          result_type?: string
          segment_key?: string | null
          segment_type?: string | null
          std_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          allow_comments: boolean
          anonymous: boolean
          confidence_level: number | null
          created_at: string
          ends_at: string | null
          id: string
          instrument_id: string
          margin_of_error: number | null
          name: string
          organization_id: string
          population_n: number | null
          response_rate: number | null
          sample_n: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          anonymous?: boolean
          confidence_level?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          instrument_id: string
          margin_of_error?: number | null
          name: string
          organization_id: string
          population_n?: number | null
          response_rate?: number | null
          sample_n?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          anonymous?: boolean
          confidence_level?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          instrument_id?: string
          margin_of_error?: number | null
          name?: string
          organization_id?: string
          population_n?: number | null
          response_rate?: number | null
          sample_n?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          instrument_id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          instrument_id: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          instrument_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          mode: Database["public"]["Enums"]["instrument_mode"]
          name: string
          slug: string
          target_size: Database["public"]["Enums"]["target_size"]
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["instrument_mode"]
          name: string
          slug: string
          target_size?: Database["public"]["Enums"]["target_size"]
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["instrument_mode"]
          name?: string
          slug?: string
          target_size?: Database["public"]["Enums"]["target_size"]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          created_at: string
          dimension_id: string
          id: string
          is_anchor: boolean
          is_attention_check: boolean
          is_reverse: boolean
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimension_id: string
          id?: string
          is_anchor?: boolean
          is_attention_check?: boolean
          is_reverse?: boolean
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimension_id?: string
          id?: string
          is_anchor?: boolean
          is_attention_check?: boolean
          is_reverse?: boolean
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      open_responses: {
        Row: {
          created_at: string
          dimension_id: string | null
          id: string
          question_type: string
          respondent_id: string
          text: string
        }
        Insert: {
          created_at?: string
          dimension_id?: string | null
          id?: string
          question_type?: string
          respondent_id: string
          text: string
        }
        Update: {
          created_at?: string
          dimension_id?: string | null
          id?: string
          question_type?: string
          respondent_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_responses_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          departments: string[]
          employee_count: number
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          size_category: Database["public"]["Enums"]["size_category"]
          slug: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          departments?: string[]
          employee_count: number
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          size_category?: Database["public"]["Enums"]["size_category"]
          slug: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          departments?: string[]
          employee_count?: number
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          size_category?: Database["public"]["Enums"]["size_category"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      respondents: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          department: string | null
          enps_score: number | null
          gender: string | null
          id: string
          ip_hash: string | null
          started_at: string | null
          status: string
          tenure: string | null
          token: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          department?: string | null
          enps_score?: number | null
          gender?: string | null
          id?: string
          ip_hash?: string | null
          started_at?: string | null
          status?: string
          tenure?: string | null
          token?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          department?: string | null
          enps_score?: number | null
          gender?: string | null
          id?: string
          ip_hash?: string | null
          started_at?: string | null
          status?: string
          tenure?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "respondents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answered_at: string
          id: string
          item_id: string
          respondent_id: string
          score: number | null
        }
        Insert: {
          answered_at?: string
          id?: string
          item_id: string
          respondent_id: string
          score?: number | null
        }
        Update: {
          answered_at?: string
          id?: string
          item_id?: string
          respondent_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_slug: { Args: { input: string }; Returns: string }
      get_org_department_counts: { Args: { org_id: string }; Returns: Json }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      campaign_status: "draft" | "active" | "closed" | "archived"
      instrument_mode: "full" | "pulse"
      size_category: "micro" | "small" | "medium" | "large"
      target_size: "all" | "small" | "medium"
      user_role: "super_admin" | "org_admin" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      campaign_status: ["draft", "active", "closed", "archived"],
      instrument_mode: ["full", "pulse"],
      size_category: ["micro", "small", "medium", "large"],
      target_size: ["all", "small", "medium"],
      user_role: ["super_admin", "org_admin", "member"],
    },
  },
} as const

