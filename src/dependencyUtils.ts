import { addDays } from "./utils";
import type { Task } from "./types/database";

export interface DependencyAdjustment {
  taskId: string;
  newStartDate: string;
}

/**
 * Adjusts dependent tasks when a predecessor task's dates change
 * Only adjusts FS (Finish-to-Start) dependencies where the predecessor's end date
 * would be after the dependent task's start date
 */
export function calculateDependencyAdjustments(
  changedTask: Task,
  allTasks: Task[],
  taskDependencies: Map<string, string>,
  processedTasks: Set<string> = new Set()
): DependencyAdjustment[] {
  const adjustments: DependencyAdjustment[] = [];

  if (!changedTask.end_date || processedTasks.has(changedTask.id)) return adjustments;

  // Add current task to processed set to prevent circular dependencies
  processedTasks.add(changedTask.id);

  // Find all tasks that depend on the changed task
  const dependentTasks = allTasks.filter((task) => task.depends_on && task.depends_on.includes(changedTask.id));

  for (const dependentTask of dependentTasks) {
    if (!dependentTask.start_date || !dependentTask.end_date) continue;

    // Get the dependency type
    const depKey = `${changedTask.id}-${dependentTask.id}`;
    const dependencyType = taskDependencies.get(depKey) || "FS";

    // Only adjust FS dependencies
    if (dependencyType === "FS") {
      const changedTaskEndDate = new Date(changedTask.end_date + "T00:00:00");
      const dependentTaskStartDate = new Date(dependentTask.start_date + "T00:00:00");

      // If the changed task's end date is after the dependent task's start date
      if (changedTaskEndDate >= dependentTaskStartDate) {
        // Calculate the task duration to maintain it

        // Set new start date to the day after the changed task's end date
        const newStartDate = addDays(changedTask.end_date, 1);

        adjustments.push({
          taskId: dependentTask.id,
          newStartDate,
        });

        // Recursively adjust tasks that depend on this adjusted task
        const adjustedTask = { ...dependentTask, start_date: newStartDate };
        const cascadingAdjustments = calculateDependencyAdjustments(
          adjustedTask,
          allTasks,
          taskDependencies,
          new Set(processedTasks)
        );
        adjustments.push(...cascadingAdjustments);
      }
    }
  }

  return adjustments;
}
