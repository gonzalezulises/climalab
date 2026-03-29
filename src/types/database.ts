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
      analysis_run_respondent_quality: {
        Row: {
          analysis_run_id: string
          created_at: string
          quality_status: string
          reason: string | null
          respondent_id: string
        }
        Insert: {
          analysis_run_id: string
          created_at?: string
          quality_status: string
          reason?: string | null
          respondent_id: string
        }
        Update: {
          analysis_run_id?: string
          created_at?: string
          quality_status?: string
          reason?: string | null
          respondent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_run_respondent_quality_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_run_respondent_quality_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          campaign_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          input_snapshot: Json
          logic_version: string
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          input_snapshot?: Json
          logic_version: string
          started_at?: string
          status?: string
          trigger_source: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          input_snapshot?: Json
          logic_version?: string
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_job_runs: {
        Row: {
          campaign_ids: string[]
          created_at: string
          error_message: string | null
          failed: number
          finished_at: string | null
          hours_window: number
          id: string
          metadata: Json
          processed: number
          status: string
          succeeded: number
          trigger_source: string
        }
        Insert: {
          campaign_ids?: string[]
          created_at?: string
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          hours_window?: number
          id?: string
          metadata?: Json
          processed?: number
          status?: string
          succeeded?: number
          trigger_source: string
        }
        Update: {
          campaign_ids?: string[]
          created_at?: string
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          hours_window?: number
          id?: string
          metadata?: Json
          processed?: number
          status?: string
          succeeded?: number
          trigger_source?: string
        }
        Relationships: []
      }
      business_indicators: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          indicator_name: string
          indicator_type: string
          indicator_unit: string | null
          indicator_value: number
          notes: string | null
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          indicator_name: string
          indicator_type?: string
          indicator_unit?: string | null
          indicator_value: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          indicator_name?: string
          indicator_type?: string
          indicator_unit?: string | null
          indicator_value?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_indicators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          analysis_run_id: string | null
          analysis_type: string
          campaign_id: string
          created_at: string
          data: Json
          id: string
        }
        Insert: {
          analysis_run_id?: string | null
          analysis_type: string
          campaign_id: string
          created_at?: string
          data: Json
          id?: string
        }
        Update: {
          analysis_run_id?: string | null
          analysis_type?: string
          campaign_id?: string
          created_at?: string
          data?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ai_insights: {
        Row: {
          analysis_run_id: string | null
          campaign_id: string
          created_at: string
          data: Json
          id: string
          insight_type: string
          model: string | null
          provider: string | null
          updated_at: string
        }
        Insert: {
          analysis_run_id?: string | null
          campaign_id: string
          created_at?: string
          data?: Json
          id?: string
          insight_type: string
          model?: string | null
          provider?: string | null
          updated_at?: string
        }
        Update: {
          analysis_run_id?: string | null
          campaign_id?: string
          created_at?: string
          data?: Json
          id?: string
          insight_type?: string
          model?: string | null
          provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ai_insights_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ai_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_instruments: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          instrument_id: string
          instrument_type: Database["public"]["Enums"]["instrument_type"]
          sort_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          instrument_id: string
          instrument_type: Database["public"]["Enums"]["instrument_type"]
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          instrument_id?: string
          instrument_type?: Database["public"]["Enums"]["instrument_type"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_instruments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_instruments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_results: {
        Row: {
          analysis_run_id: string | null
          avg_score: number | null
          calculated_at: string
          campaign_id: string
          dimension_id: string | null
          dimension_code: string | null
          favorability_pct: number | null
          id: string
          instrument_id: string | null
          instrument_type: Database["public"]["Enums"]["instrument_type"] | null
          metadata: Json | null
          respondent_count: number | null
          response_count: number | null
          result_type: string
          segment_key: string | null
          segment_type: string | null
          std_score: number | null
        }
        Insert: {
          analysis_run_id?: string | null
          avg_score?: number | null
          calculated_at?: string
          campaign_id: string
          dimension_id?: string | null
          dimension_code?: string | null
          favorability_pct?: number | null
          id?: string
          instrument_id?: string | null
          instrument_type?: Database["public"]["Enums"]["instrument_type"] | null
          metadata?: Json | null
          respondent_count?: number | null
          response_count?: number | null
          result_type: string
          segment_key?: string | null
          segment_type?: string | null
          std_score?: number | null
        }
        Update: {
          analysis_run_id?: string | null
          avg_score?: number | null
          calculated_at?: string
          campaign_id?: string
          dimension_id?: string | null
          dimension_code?: string | null
          favorability_pct?: number | null
          id?: string
          instrument_id?: string | null
          instrument_type?: Database["public"]["Enums"]["instrument_type"] | null
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
            foreignKeyName: "campaign_results_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_results_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_results_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats: {
        Row: {
          analysis_run_id: string | null
          avg_score: number | null
          campaign_id: string
          dimension_id: string | null
          dimension_code: string
          favorability_pct: number | null
          instrument_id: string | null
          instrument_type: Database["public"]["Enums"]["instrument_type"] | null
          last_response_at: string | null
          response_count: number
          respondent_count: number
          segment_key: string
          segment_type: string
          updated_at: string
        }
        Insert: {
          analysis_run_id?: string | null
          avg_score?: number | null
          campaign_id: string
          dimension_id?: string | null
          dimension_code: string
          favorability_pct?: number | null
          instrument_id?: string | null
          instrument_type?: Database["public"]["Enums"]["instrument_type"] | null
          last_response_at?: string | null
          response_count?: number
          respondent_count?: number
          segment_key?: string
          segment_type?: string
          updated_at?: string
        }
        Update: {
          analysis_run_id?: string | null
          avg_score?: number | null
          campaign_id?: string
          dimension_id?: string | null
          dimension_code?: string
          favorability_pct?: number | null
          instrument_id?: string | null
          instrument_type?: Database["public"]["Enums"]["instrument_type"] | null
          last_response_at?: string | null
          response_count?: number
          respondent_count?: number
          segment_key?: string
          segment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_stats_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_stats_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          allow_comments: boolean
          anonymous: boolean
          confidence_level: number | null
          context_notes: string | null
          created_at: string
          ends_at: string | null
          id: string
          instrument_id: string
          margin_of_error: number | null
          measurement_objective: string | null
          module_instrument_ids: string[]
          name: string
          objective_description: string | null
          organization_id: string
          population_n: number | null
          response_rate: number | null
          sample_n: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_departments: string[] | null
          target_population: number | null
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          anonymous?: boolean
          confidence_level?: number | null
          context_notes?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          instrument_id: string
          margin_of_error?: number | null
          measurement_objective?: string | null
          module_instrument_ids?: string[]
          name: string
          objective_description?: string | null
          organization_id: string
          population_n?: number | null
          response_rate?: number | null
          sample_n?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_departments?: string[] | null
          target_population?: number | null
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          anonymous?: boolean
          confidence_level?: number | null
          context_notes?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          instrument_id?: string
          margin_of_error?: number | null
          measurement_objective?: string | null
          module_instrument_ids?: string[]
          name?: string
          objective_description?: string | null
          organization_id?: string
          population_n?: number | null
          response_rate?: number | null
          sample_n?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_departments?: string[] | null
          target_population?: number | null
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
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          instrument_id: string
          name: string
          sort_order: number
          theoretical_basis: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          instrument_id: string
          name: string
          sort_order?: number
          theoretical_basis?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          instrument_id?: string
          name?: string
          sort_order?: number
          theoretical_basis?: string | null
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
      dimension_taxonomy: {
        Row: {
          analytics_category: string
          created_at: string
          dimension_id: string
          updated_at: string
        }
        Insert: {
          analytics_category: string
          created_at?: string
          dimension_id: string
          updated_at?: string
        }
        Update: {
          analytics_category?: string
          created_at?: string
          dimension_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_taxonomy_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: true
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          external_event_id: string
          id: string
          payload_hash: string | null
          processed_at: string | null
          respondent_id: string | null
          source: string
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          external_event_id: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          respondent_id?: string | null
          source: string
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          external_event_id?: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          respondent_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingest_events_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instrument_type: Database["public"]["Enums"]["instrument_type"]
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
          instrument_type?: Database["public"]["Enums"]["instrument_type"]
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
          instrument_type?: Database["public"]["Enums"]["instrument_type"]
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
          brand_config: Json
          commercial_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_role: string | null
          country: string
          created_at: string
          departments: Json
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
          brand_config?: Json
          commercial_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string
          created_at?: string
          departments?: Json
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
          brand_config?: Json
          commercial_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string
          created_at?: string
          departments?: Json
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
      participants: {
        Row: {
          campaign_id: string
          created_at: string
          department: string | null
          email: string
          id: string
          invitation_status: string
          invited_at: string | null
          name: string
          reminded_at: string | null
          reminder_count: number
          respondent_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          department?: string | null
          email: string
          id?: string
          invitation_status?: string
          invited_at?: string | null
          name: string
          reminded_at?: string | null
          reminder_count?: number
          respondent_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          invitation_status?: string
          invited_at?: string | null
          name?: string
          reminded_at?: string | null
          reminder_count?: number
          respondent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: true
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_dispatch_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          delivered_at: string | null
          event_type: string
          hook_name: string
          id: string
          reason: string | null
          request_id: number | null
          respondent_id: string | null
          response_body: string | null
          response_status: number | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          hook_name: string
          id?: string
          reason?: string | null
          request_id?: number | null
          respondent_id?: string | null
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          hook_name?: string
          id?: string
          reason?: string | null
          request_id?: number | null
          respondent_id?: string | null
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_dispatch_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_dispatch_events_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
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
      tally_form_mappings: {
        Row: {
          id: string
          campaign_id: string
          tally_form_id: string
          tally_form_url: string
          tally_field_key: string
          target_type: string
          target_id: string | null
          target_meta: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          tally_form_id: string
          tally_form_url: string
          tally_field_key: string
          target_type: string
          target_id?: string | null
          target_meta?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          tally_form_id?: string
          tally_form_url?: string
          tally_field_key?: string
          target_type?: string
          target_id?: string | null
          target_meta?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tally_form_mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tally_form_mappings_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "items"
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
          source: string
        }
        Insert: {
          answered_at?: string
          id?: string
          item_id: string
          respondent_id: string
          score?: number | null
          source?: string
        }
        Update: {
          answered_at?: string
          id?: string
          item_id?: string
          respondent_id?: string
          score?: number | null
          source?: string
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
      finalize_analysis_run: {
        Args: {
          p_analysis_run_id: string
          p_error_message?: string
          p_status: string
        }
        Returns: undefined
      }
      generate_slug: { Args: { input: string }; Returns: string }
      get_department_headcount: {
        Args: { p_dept_name: string; p_org_id: string }
        Returns: number
      }
      get_org_department_counts: { Args: { org_id: string }; Returns: Json }
      get_org_total_headcount: { Args: { p_org_id: string }; Returns: number }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      process_normalized_ingest: {
        Args: {
          p_campaign_id: string
          p_completed_at?: string
          p_demographics?: Json
          p_enps_score?: number
          p_external_event_id: string
          p_open_responses?: Json
          p_payload_hash?: string
          p_responses?: Json
          p_source: string
          p_started_at?: string
        }
        Returns: {
          campaign_id: string
          duplicate: boolean
          error_message: string | null
          ingest_event_id: string | null
          ok: boolean
          respondent_id: string | null
        }[]
      }
      refresh_campaign_stats: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      refresh_pipeline_dispatch_events: {
        Args: never
        Returns: number
      }
      replace_campaign_materialization: {
        Args: {
          p_analysis_run_id: string
          p_analytics: Json
          p_campaign_id: string
          p_margin_of_error: number
          p_population_n: number
          p_response_rate: number
          p_results: Json
          p_sample_n: number
        }
        Returns: undefined
      }
    }
    Enums: {
      campaign_status: "draft" | "active" | "closed" | "archived"
      instrument_mode: "full" | "pulse"
      instrument_type: "base" | "module"
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
      instrument_type: ["base", "module"],
      size_category: ["micro", "small", "medium", "large"],
      target_size: ["all", "small", "medium"],
      user_role: ["super_admin", "org_admin", "member"],
    },
  },
} as const
