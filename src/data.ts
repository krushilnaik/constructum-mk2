import type { Task, Project } from "./types/database";
import { supabase } from "./supabase";

export const sampleProjects: Project[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Website Redesign",
    description: "Complete redesign of company website with modern UI/UX",
    owner_id: "9a5dab23-b07e-46d2-bf17-f4cf037fa872",
    start_date: "2025-09-01",
    end_date: "2025-10-04",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Mobile App Development",
    description: "Native mobile application for iOS and Android",
    owner_id: "9a5dab23-b07e-46d2-bf17-f4cf037fa872",
    start_date: "2025-10-15",
    end_date: "2025-12-20",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function seedSampleData() {
  console.log("Starting seed process...");
  try {
    // Insert profile
    console.log("Inserting profile...");
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: "9a5dab23-b07e-46d2-bf17-f4cf037fa872",
        email: "krushilnaik96@gmail.com",
        full_name: "Krushil Naik",
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Error inserting profile:", profileError);
    }

    // Insert projects
    console.log("Inserting projects...");
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .upsert(sampleProjects, { onConflict: "id" });

    if (projectError) {
      console.error("Error inserting projects:", projectError);
      return;
    }
    console.log("Projects inserted:", projectData);

    // Insert tasks
    console.log("Inserting tasks...");
    const { data: taskData, error: taskError } = await supabase.from("tasks").upsert(sampleTasks, { onConflict: "id" });

    if (taskError) {
      console.error("Error inserting tasks:", taskError);
      return;
    }
    console.log("Tasks inserted:", taskData);

    console.log("Sample data seeded successfully!");
  } catch (error) {
    console.error("Error seeding sample data:", error);
  }
}

export const sampleTasks: Task[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Project kickoff",
    duration_days: 3,
    start_date: "2025-09-01",
    end_date: "2025-09-03",
    task_type: "task",
    depends_on: [],
    crew_size: 2,
    progress: 100,
    is_critical: true,
    color: "#3b82f6",
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Design Phase Summary
  {
    id: "550e8400-e29b-41d4-a716-446655440015",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Design Phase",
    duration_days: 12,
    start_date: "2025-09-04",
    end_date: "2025-09-15",
    task_type: "summary",
    depends_on: ["550e8400-e29b-41d4-a716-446655440010"],
    crew_size: 3,
    progress: 75,
    is_critical: true,
    color: "#6b7280",
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440011",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "UI/UX Design",
    duration_days: 7,
    start_date: "2025-09-04",
    end_date: "2025-09-10",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440015",
    depends_on: [],
    crew_size: 2,
    progress: 100,
    is_critical: true,
    color: "#10b981",
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440016",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Design Review",
    duration_days: 5,
    start_date: "2025-09-11",
    end_date: "2025-09-15",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440015",
    depends_on: ["550e8400-e29b-41d4-a716-446655440011"],
    crew_size: 1,
    progress: 50,
    is_critical: true,
    color: "#06b6d4",
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Development Phase Summary
  {
    id: "550e8400-e29b-41d4-a716-446655440017",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Development Phase",
    duration_days: 15,
    start_date: "2025-09-16",
    end_date: "2025-09-30",
    task_type: "summary",
    depends_on: ["550e8400-e29b-41d4-a716-446655440015"],
    crew_size: 5,
    progress: 20,
    is_critical: true,
    color: "#6b7280",
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440012",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Frontend Development",
    duration_days: 10,
    start_date: "2025-09-16",
    end_date: "2025-09-25",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440017",
    depends_on: [],
    crew_size: 3,
    progress: 30,
    is_critical: true,
    color: "#f59e0b",
    sort_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440018",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Backend Development",
    duration_days: 15,
    start_date: "2025-09-16",
    end_date: "2025-09-30",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440017",
    depends_on: [],
    crew_size: 2,
    progress: 10,
    is_critical: true,
    color: "#8b5cf6",
    sort_order: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440013",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Testing",
    duration_days: 7,
    start_date: "2025-10-01",
    end_date: "2025-10-02",
    task_type: "task",
    depends_on: ["550e8400-e29b-41d4-a716-446655440017"],
    crew_size: 3,
    progress: 0,
    is_critical: false,
    color: "#ef4444",
    sort_order: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440014",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Release",
    duration_days: 2,
    start_date: "2025-10-03",
    end_date: "2025-10-04",
    task_type: "task",
    depends_on: ["550e8400-e29b-41d4-a716-446655440013"],
    crew_size: 2,
    progress: 0,
    is_critical: true,
    color: "#10b981",
    sort_order: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440020",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Requirements Analysis",
    duration_days: 5,
    start_date: "2025-10-15",
    end_date: "2025-10-19",
    task_type: "task",
    depends_on: [],
    crew_size: 2,
    progress: 0,
    is_critical: true,
    color: "#06b6d4",
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "UI/UX Design",
    duration_days: 10,
    start_date: "2025-10-22",
    end_date: "2025-11-01",
    task_type: "task",
    depends_on: ["550e8400-e29b-41d4-a716-446655440020"],
    crew_size: 3,
    progress: 0,
    is_critical: true,
    color: "#8b5cf6",
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Mobile Development Summary
  {
    id: "550e8400-e29b-41d4-a716-446655440025",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Mobile Development",
    duration_days: 30,
    start_date: "2025-11-04",
    end_date: "2025-12-03",
    task_type: "summary",
    depends_on: ["550e8400-e29b-41d4-a716-446655440021"],
    crew_size: 8,
    progress: 0,
    is_critical: true,
    color: "#6b7280",
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440022",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "iOS Development",
    duration_days: 30,
    start_date: "2025-11-04",
    end_date: "2025-12-03",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440025",
    depends_on: [],
    crew_size: 4,
    progress: 0,
    is_critical: true,
    color: "#10b981",
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440023",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Android Development",
    duration_days: 30,
    start_date: "2025-11-04",
    end_date: "2025-12-03",
    task_type: "task",
    parent_id: "550e8400-e29b-41d4-a716-446655440025",
    depends_on: [],
    crew_size: 4,
    progress: 0,
    is_critical: true,
    color: "#f59e0b",
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440024",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    name: "App Store Deployment",
    duration_days: 5,
    start_date: "2025-12-16",
    end_date: "2025-12-20",
    task_type: "task",
    depends_on: ["550e8400-e29b-41d4-a716-446655440025"],
    crew_size: 2,
    progress: 0,
    is_critical: false,
    color: "#ef4444",
    sort_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
