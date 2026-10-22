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
      applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string | null
          professional_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          professional_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          professional_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      bookings: {
        Row: {
          application_id: string
          checked_in_at: string | null
          company_id: string
          created_at: string
          ends_at: string
          id: string
          job_id: string
          professional_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          checked_in_at?: string | null
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          job_id: string
          professional_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          checked_in_at?: string | null
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          job_id?: string
          professional_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_complement: string | null
          address_district: string | null
          address_line: string | null
          address_number: string | null
          city: string | null
          created_at: string
          description: string | null
          document: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_district?: string | null
          address_line?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_district?: string | null
          address_line?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_revenues: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          id: string
          job_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          id?: string
          job_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_revenues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_revenues_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_analytics_events: {
        Row: {
          actor_id: string
          created_at: string
          event_date: string
          event_type: string
          id: number
          job_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_date?: string
          event_type: string
          id?: never
          job_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: never
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_analytics_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          application_deadline: string | null
          approx_lat: number | null
          approx_lng: number | null
          banner_url: string | null
          benefits: string | null
          category_id: string | null
          city: string
          company_id: string
          created_at: string
          created_by: string
          description: string
          ends_at: string
          id: string
          is_demo: boolean
          pay_amount: number
          positions: number
          published_at: string | null
          requirements: string | null
          starts_at: string
          state: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          venue_name: string
        }
        Insert: {
          address?: string | null
          application_deadline?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          banner_url?: string | null
          benefits?: string | null
          category_id?: string | null
          city: string
          company_id: string
          created_at?: string
          created_by?: string
          description?: string
          ends_at: string
          id?: string
          is_demo?: boolean
          pay_amount: number
          positions?: number
          published_at?: string | null
          requirements?: string | null
          starts_at: string
          state: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          venue_name?: string
        }
        Update: {
          address?: string | null
          application_deadline?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          banner_url?: string | null
          benefits?: string | null
          category_id?: string | null
          city?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          ends_at?: string
          id?: string
          is_demo?: boolean
          pay_amount?: number
          positions?: number
          published_at?: string | null
          requirements?: string | null
          starts_at?: string
          state?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "professional_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          booking_id: string | null
          company_id: string
          contractor_fee_amount: number
          created_at: string
          fee_amount: number
          gross_amount: number
          id: string
          idempotency_key: string | null
          kind: string
          method: string | null
          net_amount: number
          pro_fee_amount: number
          provider: string | null
          provider_ref: string | null
          reconciled_at: string | null
          status: string
          subscription_id: string | null
          total_charge: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          company_id: string
          contractor_fee_amount?: number
          created_at?: string
          fee_amount?: number
          gross_amount?: number
          id?: string
          idempotency_key?: string | null
          kind: string
          method?: string | null
          net_amount?: number
          pro_fee_amount?: number
          provider?: string | null
          provider_ref?: string | null
          reconciled_at?: string | null
          status?: string
          subscription_id?: string | null
          total_charge?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          company_id?: string
          contractor_fee_amount?: number
          created_at?: string
          fee_amount?: number
          gross_amount?: number
          id?: string
          idempotency_key?: string | null
          kind?: string
          method?: string | null
          net_amount?: number
          pro_fee_amount?: number
          provider?: string | null
          provider_ref?: string | null
          reconciled_at?: string | null
          status?: string
          subscription_id?: string | null
          total_charge?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      professional_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_categories_map: {
        Row: {
          category_id: string
          created_at: string
          professional_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          professional_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_categories_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "professional_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_categories_map_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["app_role"] | null
          address_line: string | null
          approx_lat: number | null
          approx_lng: number | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          experience_years: number | null
          full_name: string | null
          id: string
          onboarding_step: number
          phone: string | null
          postal_code: string | null
          skills: string[]
          state: string | null
          status: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at: string | null
          updated_at: string
          verification_provider: string | null
          verification_ref: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["app_role"] | null
          address_line?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          id: string
          onboarding_step?: number
          phone?: string | null
          postal_code?: string | null
          skills?: string[]
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          verification_provider?: string | null
          verification_ref?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["app_role"] | null
          address_line?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          id?: string
          onboarding_step?: number
          phone?: string | null
          postal_code?: string | null
          skills?: string[]
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          verification_provider?: string | null
          verification_ref?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_qr_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          last_scanned_at: string | null
          scanned_by: string | null
          token: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          last_scanned_at?: string | null
          scanned_by?: string | null
          token?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_scanned_at?: string | null
          scanned_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_qr_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string | null
          provider_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      add_event_revenue: {
        Args: { _amount: number; _description: string; _job: string }
        Returns: string
      }
      admin_financial_stats: { Args: never; Returns: Json }
      admin_list_users: {
        Args: { _search?: string }
        Returns: {
          account_type: Database["public"]["Enums"]["app_role"]
          city: string
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          state: string
          status: Database["public"]["Enums"]["profile_status"]
        }[]
      }
      admin_revenue_report: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      admin_set_profile_status: {
        Args: {
          _status: Database["public"]["Enums"]["profile_status"]
          _user: string
        }
        Returns: undefined
      }
      admin_stats: {
        Args: { _city?: string; _from?: string; _state?: string; _to?: string }
        Returns: Json
      }
      apply_to_job: {
        Args: { _job: string; _message?: string }
        Returns: string
      }
      check_in_booking: {
        Args: { _token: string }
        Returns: {
          booking_id: string
          checked_in_at: string
          ends_at: string
          job_title: string
          professional_name: string
          starts_at: string
        }[]
      }
      choose_account_type: {
        Args: { _type: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      confirm_hire: { Args: { _app: string }; Returns: string }
      contractor_events_report: {
        Args: never
        Returns: {
          balance: number
          checkins: number
          fees: number
          hired: number
          job_id: string
          labor_cost: number
          positions: number
          pro_payout: number
          revenue: number
          starts_at: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }[]
      }
      contractor_fee_pct: { Args: never; Returns: number }
      delete_event_revenue: { Args: { _id: string }; Returns: undefined }
      generate_payment_list: { Args: { _job: string }; Returns: number }
      get_booking_qr: { Args: { _booking: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      job_applicants: {
        Args: { _job: string }
        Returns: {
          application_id: string
          avatar_url: string
          avg_rating: number
          categories: string[]
          city: string
          created_at: string
          distance_km: number
          full_name: string
          has_conflict: boolean
          message: string
          professional_id: string
          state: string
          status: Database["public"]["Enums"]["application_status"]
        }[]
      }
      job_payment_list: {
        Args: { _job: string }
        Returns: {
          booking_id: string
          booking_status: Database["public"]["Enums"]["booking_status"]
          checked_in_at: string
          contractor_fee: number
          fee: number
          gross: number
          net: number
          payment_id: string
          payment_status: string
          pro_fee: number
          professional_name: string
          total_charge: number
        }[]
      }
      notify: {
        Args: { _body: string; _link: string; _title: string; _user: string }
        Returns: undefined
      }
      owns_company: { Args: { _company: string }; Returns: boolean }
      service_fee_pct: { Args: never; Returns: number }
      set_application_status: {
        Args: {
          _app: string
          _status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      set_platform_setting: {
        Args: { _key: string; _value: Json }
        Returns: undefined
      }
      track_job_event: {
        Args: { _job: string; _type: string }
        Returns: undefined
      }
      verify_qr_token: {
        Args: { _token: string }
        Returns: {
          booking_id: string
          ends_at: string
          job_title: string
          professional_name: string
          starts_at: string
        }[]
      }
      withdraw_application: { Args: { _app: string }; Returns: undefined }
      write_audit: {
        Args: { _action: string; _details?: Json; _entity: string; _id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "contractor" | "professional" | "seller"
      application_status:
        | "applied"
        | "in_review"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "hired"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      job_status: "draft" | "published" | "paused" | "closed" | "filled"
      profile_status:
        | "incomplete"
        | "pending_verification"
        | "approved"
        | "rejected"
        | "blocked"
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
    Enums: {
      app_role: ["admin", "contractor", "professional", "seller"],
      application_status: [
        "applied",
        "in_review",
        "approved",
        "rejected",
        "withdrawn",
        "hired",
      ],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      job_status: ["draft", "published", "paused", "closed", "filled"],
      profile_status: [
        "incomplete",
        "pending_verification",
        "approved",
        "rejected",
        "blocked",
      ],
    },
  },
} as const
