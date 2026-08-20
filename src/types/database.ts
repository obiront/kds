// -----------------------------------------------------------------------------
// Database types for the KDS schema.
//
// Shape mirrors the output of `supabase gen types typescript`, so that in step 4
// this file can be replaced by the real generated output without touching any
// consumer. Do not hand-edit for convenience: derived and domain-friendly
// aliases belong in ./models.ts, which survives regeneration.
//
// Source of truth: supabase/migrations/20260820120000_kds_schema.sql
//
// Postgres -> TypeScript mapping used here:
//   uuid          -> string
//   text          -> string
//   integer       -> number
//   numeric(10,2) -> number
//   boolean       -> boolean
//   timestamptz   -> string (ISO 8601)
//
// Note on order_items.line_total: it is a STORED generated column, so it appears
// in Row but is absent from Insert and Update. That is deliberate — the type
// system refuses any attempt to write it from application code.
// -----------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      stations: {
        Row: {
          id: string
          code: string
          name_uk: string
          sort_order: number
        }
        Insert: {
          id?: string
          code: string
          name_uk: string
          sort_order?: number
        }
        Update: {
          id?: string
          code?: string
          name_uk?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          name: string
          station_id: string
          unit_type: Database['public']['Enums']['unit_type']
          unit_price: number | null
          price_per_100g: number | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          station_id: string
          unit_type: Database['public']['Enums']['unit_type']
          unit_price?: number | null
          price_per_100g?: number | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          station_id?: string
          unit_type?: Database['public']['Enums']['unit_type']
          unit_price?: number | null
          price_per_100g?: number | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_station_id_fkey'
            columns: ['station_id']
            isOneToOne: false
            referencedRelation: 'stations'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          table_number: number
          waiter_id: string | null
          status: Database['public']['Enums']['order_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: number
          waiter_id?: string | null
          status?: Database['public']['Enums']['order_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: number
          waiter_id?: string | null
          status?: Database['public']['Enums']['order_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_waiter_id_fkey'
            columns: ['waiter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          station_id: string
          item_name_snapshot: string
          unit_type: Database['public']['Enums']['unit_type']
          quantity: number | null
          weight_grams: number | null
          unit_price_snapshot: number | null
          price_per_100g_snapshot: number | null
          /** STORED generated column — computed by Postgres, never written by clients. */
          line_total: number | null
          item_status: Database['public']['Enums']['order_status']
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          station_id: string
          item_name_snapshot: string
          unit_type: Database['public']['Enums']['unit_type']
          quantity?: number | null
          weight_grams?: number | null
          unit_price_snapshot?: number | null
          price_per_100g_snapshot?: number | null
          item_status?: Database['public']['Enums']['order_status']
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          station_id?: string
          item_name_snapshot?: string
          unit_type?: Database['public']['Enums']['unit_type']
          quantity?: number | null
          weight_grams?: number | null
          unit_price_snapshot?: number | null
          price_per_100g_snapshot?: number | null
          item_status?: Database['public']['Enums']['order_status']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_station_id_fkey'
            columns: ['station_id']
            isOneToOne: false
            referencedRelation: 'stations'
            referencedColumns: ['id']
          },
        ]
      }
      modifiers: {
        Row: {
          id: string
          name_uk: string
        }
        Insert: {
          id?: string
          name_uk: string
        }
        Update: {
          id?: string
          name_uk?: string
        }
        Relationships: []
      }
      order_item_modifiers: {
        Row: {
          order_item_id: string
          modifier_id: string
        }
        Insert: {
          order_item_id: string
          modifier_id: string
        }
        Update: {
          order_item_id?: string
          modifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_item_modifiers_order_item_id_fkey'
            columns: ['order_item_id']
            isOneToOne: false
            referencedRelation: 'order_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_item_modifiers_modifier_id_fkey'
            columns: ['modifier_id']
            isOneToOne: false
            referencedRelation: 'modifiers'
            referencedColumns: ['id']
          },
        ]
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          from_status: Database['public']['Enums']['order_status'] | null
          to_status: Database['public']['Enums']['order_status']
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          order_id: string
          from_status?: Database['public']['Enums']['order_status'] | null
          to_status: Database['public']['Enums']['order_status']
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          from_status?: Database['public']['Enums']['order_status'] | null
          to_status?: Database['public']['Enums']['order_status']
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_status_history_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_status_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      unit_type: 'portion' | 'weight'
      order_status: 'new' | 'prep' | 'ready' | 'served'
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T]
