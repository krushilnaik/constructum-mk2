import { useRef, useState, useEffect, useMemo } from "react";
import { GanttChart } from "./GanttChart";
import { supabase } from "../supabase";
import { addDays, daysBetween } from "../utils";
import type { Project, Task } from "../types/database";

interface Props {
  projects: Project[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string | null) => void;
  onTasksUpdate: (tasks: Task[]) => void;
}

export function SynchronizedGanttContainer({ projects, selectedTaskId, onTaskSelect, onTasksUpdate }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Fetch all tasks for selected projects
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (projects.length === 0) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in(
          "project_id",
          projects.map((p) => p.id)
        );

      if (error) console.error("Error fetching tasks:", error);
      else setAllTasks(data || []);
    };

    fetchAllTasks();
  }, [projects]);

  // Update local tasks when parent tasks change
  const handleTasksUpdate = (updatedTasks: Task[]) => {
    setAllTasks((prev) => {
      const projectIds = new Set(projects.map((p) => p.id));
      const otherTasks = prev.filter((t) => !projectIds.has(t.project_id));
      const relevantTasks = updatedTasks.filter((t) => projectIds.has(t.project_id));
      return [...otherTasks, ...relevantTasks];
    });
    onTasksUpdate(updatedTasks);
  };

  // Calculate unified date range across all projects
  const { minDate, totalDays } = useMemo(() => {
    if (allTasks.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { minDate: today, totalDays: 1 };
    }

    const tasksWithDates = allTasks.filter((t) => t.start_date && t.end_date);
    if (tasksWithDates.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { minDate: today, totalDays: 1 };
    }

    const min = tasksWithDates.reduce(
      (acc, t) => (t.start_date! < acc ? t.start_date! : acc),
      tasksWithDates[0].start_date!
    );
    const max = tasksWithDates.reduce((acc, t) => (t.end_date! > acc ? t.end_date! : acc), tasksWithDates[0].end_date!);

    return {
      minDate: addDays(min, -1),
      totalDays: daysBetween(addDays(min, -1), addDays(max, 1)) + 1,
    };
  }, [allTasks]);

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-full">
          {projects.map((project) => (
            <div key={project.id} className="border-b border-gray-200">
              <div className="p-2 px-6 sticky left-0 z-10 flex gap-3 items-center">
                <span className="w-4 h-4 rounded-full bg-blue-400" />
                <h2 className="font-semibold text-gray-800">{project.name}</h2>
              </div>
              <GanttChart
                project={project}
                selectedTaskId={selectedTaskId}
                onTaskSelect={onTaskSelect}
                onTasksUpdate={handleTasksUpdate}
                sharedMinDate={minDate}
                sharedTotalDays={totalDays}
                externalTasks={allTasks}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
