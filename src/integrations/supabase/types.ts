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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          date: string
          id: string
          lean_mass_kg: number | null
          notes: string | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          id?: string
          lean_mass_kg?: number | null
          notes?: string | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          id?: string
          lean_mass_kg?: number | null
          notes?: string | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          fasted: boolean
          id: string
          mood: number | null
          note: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          fasted?: boolean
          id?: string
          mood?: number | null
          note?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          fasted?: boolean
          id?: string
          mood?: number | null
          note?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          cues: string | null
          equipment: string | null
          id: string
          instructions: string | null
          name: string
          primary_muscle: string
          secondary_muscles: string[] | null
        }
        Insert: {
          created_at?: string
          cues?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          name: string
          primary_muscle: string
          secondary_muscles?: string[] | null
        }
        Update: {
          created_at?: string
          cues?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          name?: string
          primary_muscle?: string
          secondary_muscles?: string[] | null
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          active: boolean
          author: string | null
          category: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          published_date: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          author?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          published_date?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          author?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          published_date?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      logged_sets: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          is_warmup: boolean
          notes: string | null
          reps: number | null
          rir: number | null
          session_id: string
          set_index: number
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_warmup?: boolean
          notes?: string | null
          reps?: number | null
          rir?: number | null
          session_id: string
          set_index: number
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_warmup?: boolean
          notes?: string | null
          reps?: number | null
          rir?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logged_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          activity_level: string | null
          age_range: string | null
          allergies: string | null
          avoid_exercises: string | null
          completed: boolean
          created_at: string
          days_per_week: number | null
          dietary_preferences: string | null
          equipment: string[] | null
          experience: string | null
          goal: string | null
          height_cm: number | null
          id: string
          injuries: string | null
          location: string | null
          priority_muscles: string[] | null
          session_minutes: number | null
          sex: string | null
          sleep_hours: number | null
          split_preference: string | null
          stress_level: number | null
          target_weight_kg: number | null
          timeline_weeks: number | null
          units: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age_range?: string | null
          allergies?: string | null
          avoid_exercises?: string | null
          completed?: boolean
          created_at?: string
          days_per_week?: number | null
          dietary_preferences?: string | null
          equipment?: string[] | null
          experience?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          location?: string | null
          priority_muscles?: string[] | null
          session_minutes?: number | null
          sex?: string | null
          sleep_hours?: number | null
          split_preference?: string | null
          stress_level?: number | null
          target_weight_kg?: number | null
          timeline_weeks?: number | null
          units?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age_range?: string | null
          allergies?: string | null
          avoid_exercises?: string | null
          completed?: boolean
          created_at?: string
          days_per_week?: number | null
          dietary_preferences?: string | null
          equipment?: string[] | null
          experience?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          location?: string | null
          priority_muscles?: string[] | null
          session_minutes?: number | null
          sex?: string | null
          sleep_hours?: number | null
          split_preference?: string | null
          stress_level?: number | null
          target_weight_kg?: number | null
          timeline_weeks?: number | null
          units?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coach_persona: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          coach_persona?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          coach_persona?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_days: {
        Row: {
          day_index: number
          id: string
          is_rest: boolean
          muscle_groups: string[] | null
          name: string
          program_id: string
        }
        Insert: {
          day_index: number
          id?: string
          is_rest?: boolean
          muscle_groups?: string[] | null
          name: string
          program_id: string
        }
        Update: {
          day_index?: number
          id?: string
          is_rest?: boolean
          muscle_groups?: string[] | null
          name?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          program_day_id: string
          rep_range: string | null
          rest_seconds: number | null
          sets: number
          target_rir: number | null
          tempo: string | null
        }
        Insert: {
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          program_day_id: string
          rep_range?: string | null
          rest_seconds?: number | null
          sets?: number
          target_rir?: number | null
          tempo?: string | null
        }
        Update: {
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          program_day_id?: string
          rep_range?: string | null
          rest_seconds?: number | null
          sets?: number
          target_rir?: number | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          active: boolean
          created_at: string
          days_per_week: number | null
          goal: string | null
          id: string
          name: string
          notes: string | null
          split: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_per_week?: number | null
          goal?: string | null
          id?: string
          name: string
          notes?: string | null
          split?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days_per_week?: number | null
          goal?: string | null
          id?: string
          name?: string
          notes?: string | null
          split?: string | null
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      weekly_checkins: {
        Row: {
          biggest_challenge: string | null
          biggest_win: string | null
          body_weight_kg: number | null
          created_at: string
          digestion: number | null
          energy: number | null
          hunger: number | null
          id: string
          meal_accuracy: number | null
          motivation: number | null
          notes: string | null
          pain_notes: string | null
          photo_back_url: string | null
          photo_front_url: string | null
          recommendation: string | null
          recovery: number | null
          sleep_quality: number | null
          soreness: number | null
          steps_completed: number | null
          stress_level: number | null
          user_id: string
          water_accuracy: number | null
          week_start: string
          workouts_completed: number | null
          workouts_planned: number | null
        }
        Insert: {
          biggest_challenge?: string | null
          biggest_win?: string | null
          body_weight_kg?: number | null
          created_at?: string
          digestion?: number | null
          energy?: number | null
          hunger?: number | null
          id?: string
          meal_accuracy?: number | null
          motivation?: number | null
          notes?: string | null
          pain_notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          recommendation?: string | null
          recovery?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          steps_completed?: number | null
          stress_level?: number | null
          user_id: string
          water_accuracy?: number | null
          week_start: string
          workouts_completed?: number | null
          workouts_planned?: number | null
        }
        Update: {
          biggest_challenge?: string | null
          biggest_win?: string | null
          body_weight_kg?: number | null
          created_at?: string
          digestion?: number | null
          energy?: number | null
          hunger?: number | null
          id?: string
          meal_accuracy?: number | null
          motivation?: number | null
          notes?: string | null
          pain_notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          recommendation?: string | null
          recovery?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          steps_completed?: number | null
          stress_level?: number | null
          user_id?: string
          water_accuracy?: number | null
          week_start?: string
          workouts_completed?: number | null
          workouts_planned?: number | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          difficulty: number | null
          duration_minutes: number | null
          ended_at: string | null
          energy: number | null
          id: string
          notes: string | null
          performance: number | null
          program_day_id: string | null
          soreness_notes: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          difficulty?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          performance?: number | null
          program_day_id?: string | null
          soreness_notes?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          difficulty?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          performance?: number | null
          program_day_id?: string | null
          soreness_notes?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "coach" | "admin"
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
      app_role: ["user", "coach", "admin"],
    },
  },
} as const
