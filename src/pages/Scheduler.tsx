import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "../supabase";
import { SynchronizedGanttContainer, EditPanel } from "../components";
import type { Project, Task } from "../types/database";

export function Scheduler() {
  const { projectId } = useParams({ from: "/project/$projectId" });

  const [projects, setProjects] = useState<Project[]>([]);
  // Initialize selected projects from URL param or localStorage
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(() => {
    if (projectId) return new Set([projectId]);
    const saved = localStorage.getItem("gantt-selected-projects");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Global selected task state for edit panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => localStorage.getItem("gantt-selected-task") || null
  );
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<Map<string, string>>(new Map());

  // Persist selected task to localStorage
  useEffect(() => {
    selectedTaskId
      ? localStorage.setItem("gantt-selected-task", selectedTaskId)
      : localStorage.removeItem("gantt-selected-task");
  }, [selectedTaskId]);

  // Fetch all tasks and dependencies for edit panel
  useEffect(() => {
    const fetchAllTasks = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksResult, dependenciesResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .in("project_id", [...selectedProjects])
          .order("sort_order"),
        supabase.from("task_dependencies").select("*"),
      ]);

      if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);
      else setAllTasks(tasksResult.data || []);

      if (dependenciesResult.error) console.error("Error fetching dependencies:", dependenciesResult.error);
      else {
        const depMap = new Map<string, string>();
        (dependenciesResult.data || []).forEach((dep) => {
          depMap.set(`${dep.predecessor_task_id}-${dep.successor_task_id}`, dep.dependency_type);
        });
        setTaskDependencies(depMap);
      }
    };

    if (selectedProjects.size > 0) fetchAllTasks();
  }, [selectedProjects]);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedAt = new Date().toISOString();
    setAllTasks((tasks) => tasks.map((t) => (t.id === taskId ? { ...t, ...updates, updated_at: updatedAt } : t)));

    const { error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: updatedAt })
      .eq("id", taskId);
    if (error) console.error("Error updating task:", error);
  };

  // Fetch user's projects and handle initial selection
  useEffect(() => {
    const fetchProjects = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("projects").select("*").eq("owner_id", user.id).order("name");

      if (error) console.error("Error fetching projects:", error);
      else {
        const projectData = data || [];
        setProjects(projectData);
        if (projectId) {
          setSelectedProjects(new Set([projectId]));
        } else if (!localStorage.getItem("gantt-selected-projects") && projectData.length > 0) {
          setSelectedProjects(new Set([projectData[0].id]));
        }
      }
    };
    fetchProjects();
  }, [projectId]);

  // Persist selected projects to localStorage
  useEffect(() => {
    localStorage.setItem("gantt-selected-projects", JSON.stringify([...selectedProjects]));
  }, [selectedProjects]);

  const selectedProjectsList =
    selectedProjects.size === 0 ? projects : projects.filter((p) => selectedProjects.has(p.id));

  const selectedTask = selectedTaskId ? allTasks.find((t) => t.id === selectedTaskId) : null;

  return (
    <div className="h-full flex flex-col relative">
      {selectedTask && (
        <EditPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => updateTask(selectedTaskId!, updates)}
          onDependenciesUpdate={() => {
            // Refresh tasks and dependencies from database
            const fetchAllTasks = async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;

              const [tasksResult, dependenciesResult] = await Promise.all([
                supabase
                  .from("tasks")
                  .select("*")
                  .in("project_id", [...selectedProjects])
                  .order("sort_order"),
                supabase.from("task_dependencies").select("*"),
              ]);

              if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);
              else setAllTasks(tasksResult.data || []);

              if (dependenciesResult.error) console.error("Error fetching dependencies:", dependenciesResult.error);
              else {
                const depMap = new Map<string, string>();
                (dependenciesResult.data || []).forEach((dep) => {
                  depMap.set(`${dep.predecessor_task_id}-${dep.successor_task_id}`, dep.dependency_type);
                });
                setTaskDependencies(depMap);
              }
            };
            fetchAllTasks();
          }}
          allTasks={allTasks}
          taskDependencies={taskDependencies}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Project selection controls */}
        <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedProjects(new Set(projects.map((p) => p.id)))}
              className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
            >
              Select All
            </button>
            {/* Individual project toggle buttons */}
            {projects.map((project) => {
              const isSelected = selectedProjects.has(project.id);
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    const newSelected = new Set(selectedProjects);
                    isSelected ? newSelected.delete(project.id) : newSelected.add(project.id);
                    setSelectedProjects(newSelected);
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isSelected ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {project.name}
                </button>
              );
            })}
            {selectedProjects.size > 0 && (
              <button
                onClick={() => setSelectedProjects(new Set())}
                className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Gantt chart display */}
        <div
          className={`flex-1 overflow-hidden transition-all duration-300 ease-out ${
            selectedTaskId ? "ml-sidebar" : "ml-0"
          }`}
        >
          {selectedProjectsList.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No projects available</div>
          ) : (
            <SynchronizedGanttContainer
              projects={selectedProjectsList}
              selectedTaskId={selectedTaskId}
              onTaskSelect={setSelectedTaskId}
              onTasksUpdate={setAllTasks}
            />
          )}
        </div>
      </div>
    </div>
  );
}
