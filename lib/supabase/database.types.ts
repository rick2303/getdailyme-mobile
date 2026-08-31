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
      active_sessions: {
        Row: {
          activity_id: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          color: Database["public"]["Enums"]["activity_color"]
          created_at: string
          daily_target: number | null
          icon: string
          id: string
          input_mode: Database["public"]["Enums"]["activity_input_mode"]
          is_archived: boolean
          name: string
          position: number
          quick_values: number[]
          reminder_at: string | null
          step: number
          target_period: Database["public"]["Enums"]["activity_target_period"]
          unit: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["activity_visibility"]
        }
        Insert: {
          color?: Database["public"]["Enums"]["activity_color"]
          created_at?: string
          daily_target?: number | null
          icon: string
          id?: string
          input_mode?: Database["public"]["Enums"]["activity_input_mode"]
          is_archived?: boolean
          name: string
          position?: number
          quick_values?: number[]
          reminder_at?: string | null
          step?: number
          target_period?: Database["public"]["Enums"]["activity_target_period"]
          unit?: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Update: {
          color?: Database["public"]["Enums"]["activity_color"]
          created_at?: string
          daily_target?: number | null
          icon?: string
          id?: string
          input_mode?: Database["public"]["Enums"]["activity_input_mode"]
          is_archived?: boolean
          name?: string
          position?: number
          quick_values?: number[]
          reminder_at?: string | null
          step?: number
          target_period?: Database["public"]["Enums"]["activity_target_period"]
          unit?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_id: string
          amount: number
          created_at: string
          id: string
          local_date: string
          logged_at: string
          note: string | null
          photo_url: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          amount?: number
          created_at?: string
          id?: string
          local_date?: string
          logged_at?: string
          note?: string | null
          photo_url?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          amount?: number
          created_at?: string
          id?: string
          local_date?: string
          logged_at?: string
          note?: string | null
          photo_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_shares: {
        Row: {
          activity_id: string
          created_at: string
          friend_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          friend_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          friend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_shares_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_shares_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_members: {
        Row: {
          activity_id: string | null
          challenge_id: string
          created_at: string
          status: Database["public"]["Enums"]["challenge_member_status"]
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          challenge_id: string
          created_at?: string
          status?: Database["public"]["Enums"]["challenge_member_status"]
          user_id: string
        }
        Update: {
          activity_id?: string | null
          challenge_id?: string
          created_at?: string
          status?: Database["public"]["Enums"]["challenge_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_members_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: { club_id: string; joined_at: string; role: string; user_id: string }
        Insert: { club_id: string; joined_at?: string; role?: string; user_id: string }
        Update: { club_id?: string; joined_at?: string; role?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: 'club_members_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'club_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      clubs: {
        Row: { color: string; created_at: string; creator_id: string; icon: string; id: string; invite_code: string; name: string }
        Insert: { color?: string; created_at?: string; creator_id: string; icon?: string; id?: string; invite_code?: string; name: string }
        Update: { color?: string; created_at?: string; creator_id?: string; icon?: string; id?: string; invite_code?: string; name?: string }
        Relationships: [
          {
            foreignKeyName: 'clubs_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      challenges: {
        Row: {
          club_id: string | null
          created_at: string
          creator_id: string
          ends_on: string
          id: string
          starts_on: string
          target: number
          title: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          creator_id: string
          ends_on: string
          id?: string
          starts_on?: string
          target: number
          title: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          creator_id?: string
          ends_on?: string
          id?: string
          starts_on?: string
          target?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          log_id: string
          parent_id: string | null
          reply_to_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          log_id: string
          parent_id?: string | null
          reply_to_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          log_id?: string
          parent_id?: string | null
          reply_to_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_reply_to_user_id_fkey"
            columns: ["reply_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      error_reports: {
        Row: {
          created_at: string
          digest: string | null
          id: string
          message: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          digest?: string | null
          id?: string
          message: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          digest?: string | null
          id?: string
          message?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          status: Database["public"]["Enums"]["event_member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: Database["public"]["Enums"]["event_member_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: Database["public"]["Enums"]["event_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          color: Database["public"]["Enums"]["activity_color"]
          created_at: string
          creator_id: string
          description: string | null
          ends_at: string | null
          icon: string
          id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: Database["public"]["Enums"]["activity_color"]
          created_at?: string
          creator_id: string
          description?: string | null
          ends_at?: string | null
          icon?: string
          id?: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: Database["public"]["Enums"]["activity_color"]
          created_at?: string
          creator_id?: string
          description?: string | null
          ends_at?: string | null
          icon?: string
          id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          inviter_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          inviter_id: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          inviter_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          event_id: string | null
          id: string
          log_id: string | null
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          log_id?: string | null
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          log_id?: string | null
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudges: {
        Row: {
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          sent_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          sent_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          sent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_reminder_at: string | null
          display_name: string
          id: string
          locale: string
          notify_comments: boolean
          notify_friend_logs: boolean
          notify_event_invites: boolean
          notify_friend_requests: boolean
          notify_nudges: boolean
          notify_reactions: boolean
          onboarded_at: string | null
          timezone: string
          updated_at: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_reminder_at?: string | null
          display_name: string
          id: string
          locale?: string
          notify_comments?: boolean
          notify_friend_logs?: boolean
          notify_event_invites?: boolean
          notify_friend_requests?: boolean
          notify_nudges?: boolean
          notify_reactions?: boolean
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_reminder_at?: string | null
          display_name?: string
          id?: string
          locale?: string
          notify_comments?: boolean
          notify_friend_logs?: boolean
          notify_event_invites?: boolean
          notify_friend_requests?: boolean
          notify_nudges?: boolean
          notify_reactions?: boolean
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          log_id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          comment_id: string | null
          content_snapshot: Json | null
          created_at: string
          details: string | null
          id: string
          log_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          comment_id?: string | null
          content_snapshot?: Json | null
          created_at?: string
          details?: string | null
          id?: string
          log_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          comment_id?: string | null
          content_snapshot?: Json | null
          created_at?: string
          details?: string | null
          id?: string
          log_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
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
      club_weekly_ranking: {
        Args: { p_club_id: string }
        Returns: { user_id: string; log_count: number }[]
      }
      join_club: {
        Args: { p_code: string }
        Returns: string
      }
      activity_streak: {
        Args: { p_activity_id: string }
        Returns: {
          current_streak: number
          last_logged_date: string
          longest_streak: number
        }[]
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      block_user: { Args: { p_user_id: string }; Returns: undefined }
      can_view_activity: {
        Args: { p_activity_id: string; p_viewer: string }
        Returns: boolean
      }
      can_view_activity_photo: {
        Args: { p_object_name: string; p_viewer: string }
        Returns: boolean
      }
      can_view_event_photo: {
        Args: { p_object_name: string; p_viewer: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { p_profile_id: string; p_viewer: string }
        Returns: boolean
      }
      challenge_progress: {
        Args: { p_challenge_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          total: number
          user_id: string
        }[]
      }
      comment_audience: {
        Args: { p_comment_id: string }
        Returns: {
          user_id: string
        }[]
      }
      current_invite: { Args: never; Returns: string }
      friend_log_audience: {
        Args: { p_log_id: string }
        Returns: {
          user_id: string
        }[]
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          username: string
          display_name: string
          avatar_url: string
        }[]
      }
      log_headline: {
        Args: { p_log_id: string }
        Returns: {
          author_name: string
          activity_name: string
        }[]
      }
      daily_totals: {
        Args: { p_days?: number }
        Returns: {
          activity_id: string
          day: string
          log_count: number
          total: number
        }[]
      }
      due_activity_reminders: {
        Args: { p_window_minutes?: number }
        Returns: {
          activity_id: string
          activity_name: string
          user_id: string
        }[]
      }
      due_daily_reminders: {
        Args: { p_window_minutes?: number }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      due_streak_risk_reminders: {
        Args: { p_min_days?: number }
        Returns: {
          streak_days: number
          user_id: string
        }[]
      }
      find_profile_by_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      friend_feed: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          activity_color: Database["public"]["Enums"]["activity_color"]
          activity_icon: string
          activity_id: string
          activity_name: string
          activity_unit: string
          amount: number
          avatar_url: string
          display_name: string
          log_id: string
          logged_at: string
          note: string
          photo_url: string
          reaction_summary: Json
          user_id: string
          username: string
        }[]
      }
      is_challenge_member: {
        Args: { p_challenge_id: string; p_user: string }
        Returns: boolean
      }
      is_event_member: {
        Args: { p_event_id: string; p_user: string }
        Returns: boolean
      }
      profile_card: {
        Args: { p_user_id: string }
        Returns: {
          active_days: number
          avatar_url: string
          created_at: string
          current_streak: number
          display_name: string
          id: string
          longest_streak: number
          total_logs: number
          username: string
        }[]
      }
      redeem_invite: {
        Args: { p_token: string }
        Returns: {
          avatar_url: string
          display_name: string
          inviter_id: string
          outcome: string
          username: string
        }[]
      }
      rotate_invite: { Args: never; Returns: string }
      storage_path_uuid: {
        Args: { p_object_name: string; p_segment: number }
        Returns: string
      }
      today_summary: {
        Args: { p_user_id: string }
        Returns: {
          activity_id: string
          log_count: number
          total: number
        }[]
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      activity_color:
        | "blue"
        | "cyan"
        | "teal"
        | "green"
        | "lime"
        | "amber"
        | "orange"
        | "red"
        | "pink"
        | "purple"
        | "indigo"
        | "slate"
      activity_input_mode: "counter" | "duration" | "check" | "amount"
      activity_target_period: "day" | "week"
      activity_visibility: "private" | "friends" | "custom"
      challenge_member_status: "invited" | "joined" | "declined"
      event_member_status: "invited" | "going" | "declined"
      friendship_status: "pending" | "accepted" | "declined" | "blocked"
      notification_type:
        | "comment"
        | "reply"
        | "reaction"
        | "friend_request"
        | "friend_accept"
        | "event_invite"
      reaction_type: "fire" | "clap" | "heart" | "laugh" | "muscle"
      report_reason: "spam" | "harassment" | "inappropriate" | "other"
      report_target: "log" | "comment" | "profile"
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
      activity_color: [
        "blue",
        "cyan",
        "teal",
        "green",
        "lime",
        "amber",
        "orange",
        "red",
        "pink",
        "purple",
        "indigo",
        "slate",
      ],
      activity_input_mode: ["counter", "duration", "check", "amount"],
      activity_target_period: ["day", "week"],
      activity_visibility: ["private", "friends", "custom"],
      challenge_member_status: ["invited", "joined", "declined"],
      event_member_status: ["invited", "going", "declined"],
      friendship_status: ["pending", "accepted", "declined", "blocked"],
      notification_type: [
        "comment",
        "reply",
        "reaction",
        "friend_request",
        "friend_accept",
        "event_invite",
      ],
      reaction_type: ["fire", "clap", "heart", "laugh", "muscle"],
      report_reason: ["spam", "harassment", "inappropriate", "other"],
      report_target: ["log", "comment", "profile"],
    },
  },
} as const

