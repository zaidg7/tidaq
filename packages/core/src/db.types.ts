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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts_sent: {
        Row: {
          id: number
          kind: string
          price_cents: number
          resend_id: string | null
          sent_at: string
          watch_id: string
        }
        Insert: {
          id?: never
          kind: string
          price_cents: number
          resend_id?: string | null
          sent_at?: string
          watch_id: string
        }
        Update: {
          id?: never
          kind?: string
          price_cents?: number
          resend_id?: string | null
          sent_at?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_sent_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_code: string
          id: number
          name_de: string
          name_en: string
          slug: string
        }
        Insert: {
          country_code: string
          id?: never
          name_de: string
          name_en: string
          slug: string
        }
        Update: {
          country_code?: string
          id?: never
          name_de?: string
          name_en?: string
          slug?: string
        }
        Relationships: []
      }
      collector_runs: {
        Row: {
          budget_reason: string | null
          daily_cap: number | null
          env: string
          errors: Json
          est_cost_usd: number
          finished_at: string | null
          id: number
          kind: string
          started_at: string
          tasks_done: number
          tasks_posted: number
          tasks_skipped: number
        }
        Insert: {
          budget_reason?: string | null
          daily_cap?: number | null
          env?: string
          errors?: Json
          est_cost_usd?: number
          finished_at?: string | null
          id?: never
          kind?: string
          started_at?: string
          tasks_done?: number
          tasks_posted?: number
          tasks_skipped?: number
        }
        Update: {
          budget_reason?: string | null
          daily_cap?: number | null
          env?: string
          errors?: Json
          est_cost_usd?: number
          finished_at?: string | null
          id?: never
          kind?: string
          started_at?: string
          tasks_done?: number
          tasks_posted?: number
          tasks_skipped?: number
        }
        Relationships: []
      }
      collector_tasks: {
        Row: {
          collected_at: string | null
          cost_usd: number
          error: string | null
          id: string
          posted_at: string
          run_id: number
          status: string
          stay_id: number
        }
        Insert: {
          collected_at?: string | null
          cost_usd?: number
          error?: string | null
          id: string
          posted_at?: string
          run_id: number
          status?: string
          stay_id: number
        }
        Update: {
          collected_at?: string | null
          cost_usd?: number
          error?: string | null
          id?: string
          posted_at?: string
          run_id?: number
          status?: string
          stay_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "collector_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "collector_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_tasks_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "tracked_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_tasks_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_hotel_calendar"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "collector_tasks_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["stay_id"]
          },
        ]
      }
      events: {
        Row: {
          at: string
          id: number
          name: string
          props: Json
        }
        Insert: {
          at?: string
          id?: never
          name: string
          props?: Json
        }
        Update: {
          at?: string
          id?: never
          name?: string
          props?: Json
        }
        Relationships: []
      }
      hotels: {
        Row: {
          active: boolean
          city_id: number
          created_at: string
          dfs_hotel_identifier: string | null
          id: number
          image_credit: string | null
          image_source_url: string | null
          image_url: string | null
          liteapi_id: string | null
          lat: number | null
          lng: number | null
          name: string
          official_url: string | null
          slug: string
          stars: number
          xotelo_key: string | null
        }
        Insert: {
          active?: boolean
          city_id: number
          created_at?: string
          dfs_hotel_identifier?: string | null
          id?: never
          image_credit?: string | null
          image_source_url?: string | null
          image_url?: string | null
          liteapi_id?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          official_url?: string | null
          slug: string
          stars?: number
          xotelo_key?: string | null
        }
        Update: {
          active?: boolean
          city_id?: number
          created_at?: string
          dfs_hotel_identifier?: string | null
          id?: never
          image_credit?: string | null
          image_source_url?: string | null
          image_url?: string | null
          liteapi_id?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          official_url?: string | null
          slug?: string
          stars?: number
          xotelo_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      night_accuracy: {
        Row: {
          computed_at: string
          day: string
          median_gap_pct: number | null
          pairs: number
          pairs_shown: number
          stays: number
          stays_within_3: number
          within_05: number
          within_10: number
          within_3: number
          within_3_shown: number
          worst: Json
        }
        Insert: {
          computed_at?: string
          day: string
          median_gap_pct?: number | null
          pairs: number
          pairs_shown?: number
          stays: number
          stays_within_3: number
          within_05: number
          within_10: number
          within_3: number
          within_3_shown?: number
          worst?: Json
        }
        Update: {
          computed_at?: string
          day?: string
          median_gap_pct?: number | null
          pairs?: number
          pairs_shown?: number
          stays?: number
          stays_within_3?: number
          within_05?: number
          within_10?: number
          within_3?: number
          within_3_shown?: number
          worst?: Json
        }
        Relationships: []
      }
      night_accuracy_hotel: {
        Row: {
          day: string
          hotel_id: number
          median_signed_gap_pct: number
          pairs: number
          within_3: number
        }
        Insert: {
          day: string
          hotel_id: number
          median_signed_gap_pct: number
          pairs: number
          within_3: number
        }
        Update: {
          day?: string
          hotel_id?: number
          median_signed_gap_pct?: number
          pairs?: number
          within_3?: number
        }
        Relationships: [
          {
            foreignKeyName: "night_accuracy_hotel_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      night_daily: {
        Row: {
          adults: number
          best_cents: number | null
          best_provider_id: number | null
          collected_at: string
          day: string
          hotel_id: number
          night: string
          per_provider: Json
        }
        Insert: {
          adults?: number
          best_cents?: number | null
          best_provider_id?: number | null
          collected_at?: string
          day: string
          hotel_id: number
          night: string
          per_provider?: Json
        }
        Update: {
          adults?: number
          best_cents?: number | null
          best_provider_id?: number | null
          collected_at?: string
          day?: string
          hotel_id?: number
          night?: string
          per_provider?: Json
        }
        Relationships: [
          {
            foreignKeyName: "night_daily_best_provider_id_fkey"
            columns: ["best_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_daily_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_daily_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          board: string | null
          captured_at: string
          currency: string
          free_cancellation: boolean | null
          id: number
          provider_id: number
          raw: Json | null
          room_name: string | null
          source: string
          stay_id: number
          task_id: string | null
          total_cents: number
        }
        Insert: {
          board?: string | null
          captured_at: string
          currency?: string
          free_cancellation?: boolean | null
          id?: never
          provider_id: number
          raw?: Json | null
          room_name?: string | null
          source?: string
          stay_id: number
          task_id?: string | null
          total_cents: number
        }
        Update: {
          board?: string | null
          captured_at?: string
          currency?: string
          free_cancellation?: boolean | null
          id?: never
          provider_id?: number
          raw?: Json | null
          room_name?: string | null
          source?: string
          stay_id?: number
          task_id?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "tracked_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_hotel_calendar"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "price_snapshots_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "price_snapshots_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "collector_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_aliases: {
        Row: {
          alias: string
          provider_id: number
        }
        Insert: {
          alias: string
          provider_id: number
        }
        Update: {
          alias?: string
          provider_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_aliases_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_scores: {
        Row: {
          avg_markup_pct: number | null
          matches: number
          provider_id: number
          score: number
          tests: number
          updated_at: string
        }
        Insert: {
          avg_markup_pct?: number | null
          matches: number
          provider_id: number
          score: number
          tests: number
          updated_at: string
        }
        Update: {
          avg_markup_pct?: number | null
          matches?: number
          provider_id?: number
          score?: number
          tests?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_scores_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          affiliate_template: string | null
          created_at: string
          domain: string | null
          id: number
          is_direct: boolean
          name: string
          pending: boolean
          slug: string
        }
        Insert: {
          affiliate_template?: string | null
          created_at?: string
          domain?: string | null
          id?: never
          is_direct?: boolean
          name: string
          pending?: boolean
          slug: string
        }
        Update: {
          affiliate_template?: string | null
          created_at?: string
          domain?: string | null
          id?: never
          is_direct?: boolean
          name?: string
          pending?: boolean
          slug?: string
        }
        Relationships: []
      }
      stay_daily: {
        Row: {
          best_cents: number
          best_provider_id: number | null
          day: string
          per_provider: Json
          stay_id: number
        }
        Insert: {
          best_cents: number
          best_provider_id?: number | null
          day: string
          per_provider?: Json
          stay_id: number
        }
        Update: {
          best_cents?: number
          best_provider_id?: number | null
          day?: string
          per_provider?: Json
          stay_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stay_daily_best_provider_id_fkey"
            columns: ["best_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_daily_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "tracked_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_daily_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_hotel_calendar"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "stay_daily_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["stay_id"]
          },
        ]
      }
      stay_stats: {
        Row: {
          avg30_cents: number | null
          days_tracked: number
          high_cents: number | null
          low_cents: number | null
          now_cents: number | null
          percentile: number | null
          state: string | null
          stay_id: number
          trend_7d: number | null
          updated_at: string
        }
        Insert: {
          avg30_cents?: number | null
          days_tracked: number
          high_cents?: number | null
          low_cents?: number | null
          now_cents?: number | null
          percentile?: number | null
          state?: string | null
          stay_id: number
          trend_7d?: number | null
          updated_at: string
        }
        Update: {
          avg30_cents?: number | null
          days_tracked?: number
          high_cents?: number | null
          low_cents?: number | null
          now_cents?: number | null
          percentile?: number | null
          state?: string | null
          stay_id?: number
          trend_7d?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_stats_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: true
            referencedRelation: "tracked_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_stats_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: true
            referencedRelation: "v_hotel_calendar"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "stay_stats_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: true
            referencedRelation: "v_stay_public"
            referencedColumns: ["stay_id"]
          },
        ]
      }
      tracked_stays: {
        Row: {
          active: boolean
          adults: number
          check_in: string
          check_out: string
          created_at: string
          hotel_id: number
          id: number
          origin: string
        }
        Insert: {
          active?: boolean
          adults?: number
          check_in: string
          check_out: string
          created_at?: string
          hotel_id: number
          id?: never
          origin: string
        }
        Update: {
          active?: boolean
          adults?: number
          check_in?: string
          check_out?: string
          created_at?: string
          hotel_id?: number
          id?: never
          origin?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_stays_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_stays_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      trust_tests: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          checkout_cents: number | null
          extras: string[]
          hotel_id: number
          id: number
          listed_cents: number
          notes: string | null
          outcome: string
          provider_id: number
          screenshot_path: string | null
          tested_at: string
          tested_by: string
        }
        Insert: {
          adults: number
          check_in: string
          check_out: string
          checkout_cents?: number | null
          extras?: string[]
          hotel_id: number
          id?: never
          listed_cents: number
          notes?: string | null
          outcome: string
          provider_id: number
          screenshot_path?: string | null
          tested_at?: string
          tested_by?: string
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          checkout_cents?: number | null
          extras?: string[]
          hotel_id?: number
          id?: never
          listed_cents?: number
          notes?: string | null
          outcome?: string
          provider_id?: number
          screenshot_path?: string | null
          tested_at?: string
          tested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_tests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_tests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "trust_tests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      watchers: {
        Row: {
          confirmed_at: string | null
          consent_at: string
          consent_text: string
          created_at: string
          email: string
          id: string
          locale: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          consent_at: string
          consent_text: string
          created_at?: string
          email: string
          id?: string
          locale?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          consent_at?: string
          consent_text?: string
          created_at?: string
          email?: string
          id?: string
          locale?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      watches: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_alert_at: string | null
          last_alert_cents: number | null
          stay_id: number
          target_cents: number | null
          watcher_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_alert_at?: string | null
          last_alert_cents?: number | null
          stay_id: number
          target_cents?: number | null
          watcher_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_alert_at?: string | null
          last_alert_cents?: number | null
          stay_id?: number
          target_cents?: number | null
          watcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watches_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "tracked_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watches_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_hotel_calendar"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "watches_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "watches_watcher_id_fkey"
            columns: ["watcher_id"]
            isOneToOne: false
            referencedRelation: "watchers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_hotel_calendar: {
        Row: {
          adults: number | null
          best_cents: number | null
          best_provider_id: number | null
          check_in: string | null
          check_out: string | null
          hotel_id: number | null
          price_day: string | null
          state: string | null
          stay_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_daily_best_provider_id_fkey"
            columns: ["best_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_stays_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_stays_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_stay_public"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      v_stay_public: {
        Row: {
          active: boolean | null
          adults: number | null
          avg30_cents: number | null
          check_in: string | null
          check_out: string | null
          city_name_de: string | null
          city_name_en: string | null
          city_slug: string | null
          days_tracked: number | null
          high_cents: number | null
          hotel_id: number | null
          hotel_name: string | null
          hotel_slug: string | null
          low_cents: number | null
          nights: number | null
          now_cents: number | null
          percentile: number | null
          state: string | null
          stay_id: number | null
          trend_7d: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_health: { Args: { p_days?: number }; Returns: Json }
      alert_inputs: {
        Args: { p_today: string }
        Returns: {
          watch_id: string
          email: string
          locale: string
          manage_token: string
          hotel_slug: string
          hotel_name: string
          check_in: string
          check_out: string
          adults: number
          target_cents: number | null
          last_alert_cents: number | null
          last_alert_at: string | null
          series: Json
        }[]
      }
      alert_record: {
        Args: { p_watch_id: string; p_kind: string; p_price_cents: number; p_resend_id: string | null }
        Returns: undefined
      }
      collector_ingest: { Args: { payload: Json }; Returns: Json }
      log_web_error: { Args: { p_env: string; p_source: string; p_message: string }; Returns: undefined }
      web_error_digest: {
        Args: { p_env: string; p_since: string }
        Returns: { source: string; message: string; n: number; last_at: string }[]
      }
      night_accuracy_pairs: {
        Args: { p_day: string }
        Returns: {
          hotel_id: number
          nights_cents: number
          provider_id: number
          real_cents: number
          stay_id: number
        }[]
      }
      night_accuracy_record: {
        Args: { p_day: string }
        Returns: {
          computed_at: string
          day: string
          median_gap_pct: number | null
          pairs: number
          pairs_shown: number
          stays: number
          stays_within_3: number
          within_05: number
          within_10: number
          within_3: number
          within_3_shown: number
          worst: Json
        }
      }
      night_ingest: { Args: { payload: Json }; Returns: number }
      night_jobs: {
        Args: { p_limit: number; p_today: string; p_window: number }
        Returns: {
          hotel_id: number
          night: string
          xotelo_key: string
        }[]
      }
      night_reliability: {
        Args: { p_day: string; p_hotel_id?: number }
        Returns: {
          gap_pct: number
          hotel_id: number
          pairs: number
          reliable: boolean
          within_3: number
        }[]
      }
      prune_raw_snapshots: { Args: { older_than?: string }; Returns: number }
      rebuild_stay_daily: { Args: { p_stay_ids?: number[] }; Returns: number }
      outbound_click: {
        Args: {
          p_adults: number
          p_check_in: string
          p_check_out: string
          p_hotel: string
          p_provider: string
        }
        Returns: Json
      }
      request_stay: {
        Args: {
          p_adults: number
          p_check_in: string
          p_check_out: string
          p_hotel_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
