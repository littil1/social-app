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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          color_token: string | null
          created_at: string
          description: string | null
          family: string
          icon: string | null
          id: number
          is_active: boolean
          key: string
          level: number
          name: string
          short_label: string
          sort_order: number
          threshold: number
          updated_at: string
        }
        Insert: {
          color_token?: string | null
          created_at?: string
          description?: string | null
          family: string
          icon?: string | null
          id?: number
          is_active?: boolean
          key: string
          level: number
          name: string
          short_label: string
          sort_order?: number
          threshold: number
          updated_at?: string
        }
        Update: {
          color_token?: string | null
          created_at?: string
          description?: string | null
          family?: string
          icon?: string | null
          id?: number
          is_active?: boolean
          key?: string
          level?: number
          name?: string
          short_label?: string
          sort_order?: number
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: number
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          comment_id: number
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          comment_id?: number
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: number
          created_at: string | null
          id: number
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          comment_id: number
          created_at?: string | null
          id?: number
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: number
          created_at?: string | null
          id?: number
          reaction?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: number
          parent_id: number | null
          post_id: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          parent_id?: number | null
          post_id: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          parent_id?: number | null
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          admin_note: string | null
          comment_id: number
          comment_owner_user_id: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          comment_id: number
          comment_owner_user_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          comment_id?: number
          comment_owner_user_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_comment_owner_user_id_fkey"
            columns: ["comment_owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_post_winners: {
        Row: {
          author_id: string | null
          author_username: string | null
          awarded_at: string
          comments_count: number
          fire_count: number
          funny_count: number
          id: number
          likes_count: number
          post_content: string
          post_created_at: string
          post_id: number
          rank_position: number
          relevance_score: number
          winner_date: string
          wow_count: number
        }
        Insert: {
          author_id?: string | null
          author_username?: string | null
          awarded_at?: string
          comments_count?: number
          fire_count?: number
          funny_count?: number
          id?: number
          likes_count?: number
          post_content: string
          post_created_at: string
          post_id: number
          rank_position: number
          relevance_score?: number
          winner_date: string
          wow_count?: number
        }
        Update: {
          author_id?: string | null
          author_username?: string | null
          awarded_at?: string
          comments_count?: number
          fire_count?: number
          funny_count?: number
          id?: number
          likes_count?: number
          post_content?: string
          post_created_at?: string
          post_id?: number
          rank_position?: number
          relevance_score?: number
          winner_date?: string
          wow_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_post_winners_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_post_winners_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_comment_reactions: {
        Row: {
          comment_id: number
          created_at: string
          id: number
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: number
          created_at?: string
          id?: number
          reaction: string
          user_id: string
        }
        Update: {
          comment_id?: number
          created_at?: string
          id?: number
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feature_request_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_comments: {
        Row: {
          content: string
          created_at: string
          feature_request_id: number
          id: number
          parent_id: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feature_request_id: number
          id?: number
          parent_id?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feature_request_id?: number
          id?: number
          parent_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_comments_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feature_request_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_likes: {
        Row: {
          created_at: string
          feature_request_id: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: number
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_likes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string
          id: number
          implemented_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          implemented_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          implemented_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: number
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: number
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: number
          post_id: number | null
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          post_id?: number | null
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number | null
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: []
      }
      post_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          post_id: number
          post_owner_user_id: string | null
          reason: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id: number
          post_owner_user_id?: string | null
          reason: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: number
          post_owner_user_id?: string | null
          reason?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_post_owner_user_id_fkey"
            columns: ["post_owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: number
          post_id: number
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id: number
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number
          reaction?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          id: number
          likes_count: number
          user_id: string | null
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: number
          likes_count?: number
          user_id?: string | null
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: number
          likes_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: string[]
          bio: string | null
          created_at: string
          id: string
          is_admin: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[]
          bio?: string | null
          created_at?: string
          id: string
          is_admin?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          badges?: string[]
          bio?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_via: string
          badge_id: number
          created_at: string
          family: string
          id: number
          progress_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_via?: string
          badge_id: number
          created_at?: string
          family: string
          id?: number
          progress_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_via?: string
          badge_id?: number
          created_at?: string
          family?: string
          id?: number
          progress_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      reaction_type: "like" | "funny" | "wow" | "fire"
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
      reaction_type: ["like", "funny", "wow", "fire"],
    },
  },
} as const

