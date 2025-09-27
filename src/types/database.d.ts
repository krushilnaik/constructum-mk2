export interface Project {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  duration_days: number;
  start_date?: string | null;
  end_date?: string | null;
  // Hierarchy fields
  parent_id?: string | null;
  task_type: "task" | "summary" | "sub_summary";
  depends_on: string[];
  crew_size: number;
  progress: number;
  is_critical: boolean;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  project_id: string;
  name: string;
  type: "crew" | "equipment" | "material";
  availability: number;
  created_at: string;
  updated_at: string;
}

export interface TaskResource {
  id: string;
  task_id: string;
  resource_id: string;
  allocation: number;
  created_at: string;
}

export interface TaskDependency {
  id: string;
  from_task_id: string;
  to_task_id: string;
  dependency_type: "FS" | "SS" | "FF" | "SF";
  created_at: string;
  updated_at: string;
}

export interface TodoItem {
  id: string;
  task_id: string;
  content: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          name: string;
          owner_id: string;
          start_date: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          availability: number | null;
          created_at: string;
          id: string;
          name: string;
          project_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          availability?: number | null;
          created_at?: string;
          id?: string;
          name: string;
          project_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          availability?: number | null;
          created_at?: string;
          id?: string;
          name?: string;
          project_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          dependency_type: string;
          id: string;
          predecessor_task_id: string;
          successor_task_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dependency_type: string;
          id?: string;
          predecessor_task_id: string;
          successor_task_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dependency_type?: string;
          id?: string;
          predecessor_task_id?: string;
          successor_task_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_resources: {
        Row: {
          allocation: number | null;
          created_at: string;
          id: string;
          resource_id: string;
          task_id: string;
        };
        Insert: {
          allocation?: number | null;
          created_at?: string;
          id?: string;
          resource_id: string;
          task_id: string;
        };
        Update: {
          allocation?: number | null;
          created_at?: string;
          id?: string;
          resource_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_resources_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_resources_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_resources_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "v_tasks_with_parent";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          color: string | null;
          created_at: string;
          crew_size: number | null;
          depends_on: string[] | null;
          description: string | null;
          duration_days: number;
          end_date: string | null;
          id: string;
          is_critical: boolean | null;
          name: string | null;
          parent_id: string | null;
          progress: number | null;
          project_id: string;
          sort_order: number | null;
          start_date: string | null;
          task_type: Database["public"]["Enums"]["task_hierarchy_type"];
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          crew_size?: number | null;
          depends_on?: string[] | null;
          description?: string | null;
          duration_days?: number;
          end_date?: string | null;
          id?: string;
          is_critical?: boolean | null;
          name?: string | null;
          parent_id?: string | null;
          progress?: number | null;
          project_id: string;
          sort_order?: number | null;
          start_date?: string | null;
          task_type?: Database["public"]["Enums"]["task_hierarchy_type"];
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          crew_size?: number | null;
          depends_on?: string[] | null;
          description?: string | null;
          duration_days?: number;
          end_date?: string | null;
          id?: string;
          is_critical?: boolean | null;
          name?: string | null;
          parent_id?: string | null;
          progress?: number | null;
          project_id?: string;
          sort_order?: number | null;
          start_date?: string | null;
          task_type?: Database["public"]["Enums"]["task_hierarchy_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "v_tasks_with_parent";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      todo_items: {
        Row: {
          completed: boolean;
          content: string;
          created_at: string;
          id: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          completed?: boolean;
          content: string;
          created_at?: string;
          id?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          completed?: boolean;
          content?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_tasks_with_parent: {
        Row: {
          color: string | null;
          created_at: string | null;
          crew_size: number | null;
          depends_on: string[] | null;
          description: string | null;
          duration_days: number | null;
          end_date: string | null;
          id: string | null;
          is_critical: boolean | null;
          name: string | null;
          parent_id: string | null;
          parent_type:
            | Database["public"]["Enums"]["task_hierarchy_type"]
            | null;
          progress: number | null;
          project_id: string | null;
          start_date: string | null;
          task_type: Database["public"]["Enums"]["task_hierarchy_type"] | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "v_tasks_with_parent";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      get_tasks_with_parent: {
        Args: { project_filter_id?: string };
        Returns: {
          color: string;
          created_at: string;
          crew_size: number;
          depends_on: string[];
          description: string;
          duration_days: number;
          end_date: string;
          id: string;
          is_critical: boolean;
          name: string;
          parent_id: string;
          parent_type: Database["public"]["Enums"]["task_hierarchy_type"];
          progress: number;
          project_id: string;
          start_date: string;
          task_type: Database["public"]["Enums"]["task_hierarchy_type"];
          updated_at: string;
        }[];
      };
    };
    Enums: {
      task_hierarchy_type: "summary" | "sub_summary" | "task";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      task_hierarchy_type: ["summary", "sub_summary", "task"],
    },
  },
} as const;
