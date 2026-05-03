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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      billing_concepts: {
        Row: {
          amount: number
          applies_to_tariff_id: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          amount: number
          applies_to_tariff_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          amount?: number
          applies_to_tariff_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_concepts_applies_to_tariff_id_fkey"
            columns: ["applies_to_tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_periods: {
        Row: {
          closed_at: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          month: number
          name: string
          start_date: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          month: number
          name: string
          start_date: string
          year: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          month?: number
          name?: string
          start_date?: string
          year?: number
        }
        Relationships: []
      }
      cash_closures: {
        Row: {
          cashier_id: string | null
          closed_at: string | null
          closure_date: string | null
          created_at: string | null
          id: string
          opening_amount: number
          status: string | null
          total_collected: number | null
          total_receipts: number | null
        }
        Insert: {
          cashier_id?: string | null
          closed_at?: string | null
          closure_date?: string | null
          created_at?: string | null
          id?: string
          opening_amount: number
          status?: string | null
          total_collected?: number | null
          total_receipts?: number | null
        }
        Update: {
          cashier_id?: string | null
          closed_at?: string | null
          closure_date?: string | null
          created_at?: string | null
          id?: string
          opening_amount?: number
          status?: string | null
          total_collected?: number | null
          total_receipts?: number | null
        }
        Relationships: []
      }
customers: {
  Row: {
    address: string
    connection_type: string | null
    created_at: string | null
    current_debt: number | null
    document_number: string | null
    full_name: string
    id: string
    is_active: boolean | null
    phone: string | null
    sector: string | null
    sector_id: string | null
    supply_number: string
    tariff_id: string | null
    updated_at: string | null
  }
  Insert: {
    address: string
    connection_type?: string | null
    created_at?: string | null
    current_debt?: number | null
    document_number?: string | null
    full_name: string
    id?: string
    is_active?: boolean | null
    phone?: string | null
    sector?: string | null
    sector_id?: string | null
    supply_number: string
    tariff_id?: string | null
    updated_at?: string | null
  }
  Update: {
    address?: string
    connection_type?: string | null
    created_at?: string | null
    current_debt?: number | null
    document_number?: string | null
    full_name?: string
    id?: string
    is_active?: boolean | null
    phone?: string | null
    sector?: string | null
    sector_id?: string | null
    supply_number?: string
    tariff_id?: string | null
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "customers_tariff_id_fkey"
      columns: ["tariff_id"]
      isOneToOne: false
      referencedRelation: "tariffs"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "customers_sector_id_fkey"
      columns: ["sector_id"]
      isOneToOne: false
      referencedRelation: "sectors"
      referencedColumns: ["id"]
    },
  ]
}
      municipality_config: {
        Row: {
          address: string
          billing_cut_day: number | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          payment_grace_days: number | null
          ruc: string
        }
        Insert: {
          address: string
          billing_cut_day?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          payment_grace_days?: number | null
          ruc: string
        }
        Update: {
          address?: string
          billing_cut_day?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          payment_grace_days?: number | null
          ruc?: string
        }
        Relationships: []
      }
payments: {
      Row: {
        amount: number
        cashier_id: string | null
        created_at: string | null
        customer_id: string | null
        id: string
        method: string | null
        payment_date: string | null
        receipt_id: string | null
        reference: string | null
        status: string | null
        voided_at: string | null
      }
      Insert: {
        amount: number
        cashier_id?: string | null
        created_at?: string | null
        customer_id?: string | null
        id?: string
        method?: string | null
        payment_date?: string | null
        receipt_id?: string | null
        reference?: string | null
        status?: string | null
        voided_at?: string | null
      }
      Update: {
        amount?: number
        cashier_id?: string | null
        created_at?: string | null
        customer_id?: string | null
        id?: string
        method?: string | null
        payment_date?: string | null
        receipt_id?: string | null
        reference?: string | null
        status?: string | null
        voided_at?: string | null
      }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
   readings: {
    Row: {
      billing_period_id: string | null
      consumption: number
      created_at: string | null
      current_reading: number
      customer_id: string | null
      id: string
      is_estimated: boolean | null
      is_synced: boolean | null
      meter_reader_id: string | null
      needs_review: boolean | null
      notes: string | null
      photo_url: string | null
      previous_reading: number
      reading_date: string | null
      sync_id: string | null
    }
    Insert: {
      billing_period_id?: string | null
      consumption?: number
      created_at?: string | null
      current_reading: number
      customer_id?: string | null
      id?: string
      is_estimated?: boolean | null
      is_synced?: boolean | null
      meter_reader_id?: string | null
      needs_review?: boolean | null
      notes?: string | null
      photo_url?: string | null
      previous_reading: number
      reading_date?: string | null
      sync_id?: string | null
    }
    Update: {
      billing_period_id?: string | null
      consumption?: number
      created_at?: string | null
      current_reading?: number
      customer_id?: string | null
      id?: string
      is_estimated?: boolean | null
      is_synced?: boolean | null
      meter_reader_id?: string | null
      needs_review?: boolean | null
      notes?: string | null
      photo_url?: string | null
      previous_reading?: number
      reading_date?: string | null
      sync_id?: string | null
    }
        Relationships: [
          {
            foreignKeyName: "readings_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    receipts: {
      Row: {
        billing_period_id: string | null
        consumption_kwh: number
        created_at: string | null
        current_reading: number
        customer_id: string | null
        due_date: string
        energy_amount: number
        fixed_charges: number
        id: string
        igv: number | null
        issue_date: string | null
        paid_amount: number | null
        paid_at: string | null
              period_end: string
        period_start: string
        previous_debt: number | null
        previous_reading: number
        reading_id: string | null
        receipt_number: number
        status: string | null
        subtotal: number
        total_amount: number
        updated_at: string | null
      }
      Insert: {
        billing_period_id?: string | null
        consumption_kwh: number
        created_at?: string | null
        current_reading: number
        customer_id?: string | null
        due_date: string
        energy_amount: number
        fixed_charges: number
        id?: string
        igv?: number | null
        issue_date?: string | null
        paid_amount?: number | null
  paid_at?: string | null
  period_end: string
        period_start: string
        previous_debt?: number | null
        previous_reading: number
        reading_id?: string | null
        receipt_number?: number
        status?: string | null
        subtotal: number
        total_amount: number
        updated_at?: string | null
      }
      Update: {
        billing_period_id?: string | null
        consumption_kwh?: number
        created_at?: string | null
        current_reading?: number
        customer_id?: string | null
        due_date?: string
        energy_amount?: number
        fixed_charges?: number
        id?: string
        igv?: number | null
        issue_date?: string | null
        paid_amount?: number | null
  paid_at?: string | null
  period_end?: string
        period_start?: string
        previous_debt?: number | null
        previous_reading?: number
        reading_id?: string | null
        receipt_number?: number
        status?: string | null
        subtotal?: number
        total_amount?: number
        updated_at?: string | null
      }
        Relationships: [
          {
            foreignKeyName: "receipts_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
profiles: {
  Row: {
    id: string
    email: string
    role: string | null
    full_name: string | null
    assigned_sector_id: string | null
    created_at: string | null
    updated_at: string | null
  }
  Insert: {
    id: string
    email: string
    role?: string | null
    full_name?: string | null
    assigned_sector_id?: string | null
    created_at?: string | null
    updated_at?: string | null
  }
  Update: {
    id?: string
    email?: string
    role?: string | null
    full_name?: string | null
    assigned_sector_id?: string | null
    created_at?: string | null
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "profiles_role_fkey"
      columns: ["role"]
      isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "profiles_assigned_sector_id_fkey"
      columns: ["assigned_sector_id"]
      isOneToOne: false
      referencedRelation: "sectors"
      referencedColumns: ["id"]
    }
  ]
}
roles: {
  Row: {
    created_at: string | null
    description: string | null
    id: string
  }
  Insert: {
    created_at?: string | null
    description?: string | null
    id: string
  }
  Update: {
    created_at?: string | null
    description?: string | null
    id?: string
  }
  Relationships: []
}
sectors: {
  Row: {
    id: string
    name: string
    code: string
    description: string | null
    is_active: boolean | null
    created_at: string | null
  }
  Insert: {
    id?: string
    name: string
    code: string
    description?: string | null
    is_active?: boolean | null
    created_at?: string | null
  }
  Update: {
    id?: string
    name?: string
    code?: string
    description?: string | null
    is_active?: boolean | null
    created_at?: string | null
  }
  Relationships: []
}
tariff_tiers: {
        Row: {
          created_at: string | null
          id: string
          max_kwh: number | null
          min_kwh: number
          order_index: number
          price_per_kwh: number
          tariff_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_kwh?: number | null
          min_kwh: number
          order_index: number
          price_per_kwh: number
          tariff_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_kwh?: number | null
          min_kwh?: number
          order_index?: number
          price_per_kwh?: number
          tariff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_tiers_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          connection_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
  Functions: {
    calculate_energy_amount: {
      Args: { p_consumption: number; p_tariff_id: string }
      Returns: number
    }
    get_user_role: {
      Args: Record<PropertyKey, never>
      Returns: string
    }
    current_role: {
      Args: Record<PropertyKey, never>
      Returns: string
    }
    close_billing_period: {
      Args: { p_period_id: string }
      Returns: { success: boolean; period_id: string }[]
    }
    adjust_customer_debt: {
      Args: { p_customer_id: string; p_amount: number }
      Returns: number
    }
    recalculate_customer_debt: {
      Args: { p_customer_id: string }
      Returns: number
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
    Enums: {},
  },
} as const
