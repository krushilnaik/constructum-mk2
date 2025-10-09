import { useState, useEffect, useCallback } from "react";
import type { Task } from "../types/database";
import { calculateDependencyAdjustments } from "../dependencyUtils";
import { supabase } from "../supabase";
import type { DependencyType } from "../types";

// Debounce hook to delay API calls during rapid input changes
function useDebounce<T extends any[]>(callback: (...args: T) => void, delay: number) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: T) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      setDebounceTimer(setTimeout(() => callback(...args), delay));
    },
    [callback, delay, debounceTimer]
  );
}

interface EditPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDependenciesUpdate?: () => void;
  allTasks: Task[];
  taskDependencies?: Map<string, string>;
}

export function EditPanel({
  task,
  onClose,
  onUpdate,
  onDependenciesUpdate,
  allTasks,
  taskDependencies = new Map(),
}: EditPanelProps) {
  const [saving, setSaving] = useState(false);
  const [dependencyTypes, setDependencyTypes] = useState<Map<string, string>>(new Map());
  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  // Load dependency types for current task
  useEffect(() => {
    const fetchDependencyTypes = async () => {
      if (!task.depends_on?.length) return;

      const { data } = await supabase.from("task_dependencies").select("*").eq("successor_task_id", task.id);

      const typeMap = new Map<string, string>();
      (data || []).forEach((dep) => {
        typeMap.set(dep.predecessor_task_id, dep.dependency_type);
      });
      setDependencyTypes(typeMap);
    };
    fetchDependencyTypes();
  }, [task.id, task.depends_on]);

  const updateTaskImmediate = async (updates: Partial<Task>) => {
    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();

      // Calculate dependency adjustments if dates changed
      if (updates.start_date || updates.end_date) {
        const changedTask = { ...task, ...updates };
        const adjustments = calculateDependencyAdjustments(changedTask, allTasks, taskDependencies);

        // Apply adjustments to dependent tasks
        for (const adjustment of adjustments) {
          const { error: depError } = await supabase
            .from("tasks")
            .update({
              start_date: adjustment.newStartDate,
              updated_at: updatedAt,
            })
            .eq("id", adjustment.taskId);
          if (depError) console.error("Error updating dependent task:", depError);
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update({ ...updates, updated_at: updatedAt })
        .eq("id", task.id);

      if (error) throw error;
      onUpdate({ ...updates, updated_at: updatedAt });
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateTask = useDebounce(updateTaskImmediate, 500);

  // Update task dependencies and relationship types
  const updateDependencies = async (depends_on: DependencyType[], depTypes: Map<string, DependencyType>) => {
    setSaving(true);
    try {
      // Update task depends_on array
      updateTask({ depends_on });

      // Delete existing dependencies
      await supabase.from("task_dependencies").delete().eq("successor_task_id", task.id);

      // Insert new dependencies
      if (depends_on.length > 0) {
        const dependencies = depends_on.map((depId) => ({
          predecessor_task_id: depId,
          successor_task_id: task.id,
          dependency_type: depTypes.get(depId) || "FS",
        }));

        const { error } = await supabase.from("task_dependencies").insert(dependencies);
        if (error) throw error;
      }

      setDependencyTypes(depTypes);
      onDependenciesUpdate?.();
    } catch (error) {
      console.error("Error updating dependencies:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed left-0 top-16 w-sidebar h-[calc(100vh-4rem)] bg-white shadow-xl border-r border-gray-200 z-20 transform transition-transform duration-300 ease-out animate-in slide-in-from-left">
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Edit Task</h2>
        {saving && <div className="text-sm text-blue-600">Saving...</div>}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
          <input
            type="text"
            value={task.name || ""}
            onChange={(e) => updateTask({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter task name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={task.description || ""}
            onChange={(e) => updateTask({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
            <select
              value={task.task_type}
              onChange={(e) => updateTask({ task_type: e.target.value as "task" | "summary" | "sub_summary" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="task">Task</option>
              <option value="summary">Summary</option>
              <option value="sub_summary">Sub Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
            <input
              type="number"
              min="1"
              value={task.duration_days}
              onChange={(e) => updateTask({ duration_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={task.start_date || ""}
              onChange={(e) => updateTask({ start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            {task.start_date && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(task.start_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={task.end_date || ""}
              onChange={(e) => updateTask({ end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            {task.end_date && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(task.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}
          </div>
        </div>
        {task.start_date && task.end_date && (
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-medium">Timeline: </span>
            {new Date(task.start_date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })} -{" "}
            {new Date(task.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Crew Size</label>
            <input
              type="number"
              min="1"
              value={task.crew_size ?? 1}
              onChange={(e) => updateTask({ crew_size: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="color"
              value={task.color || "#6b7280"}
              onChange={(e) => updateTask({ color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Critical Task</span>
            <button
              type="button"
              onClick={() => updateTask({ is_critical: !(task.is_critical ?? false) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                task.is_critical ? "bg-red-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  task.is_critical ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Progress</label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={task.progress ?? 0}
              onChange={(e) => updateTask({ progress: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-medium text-gray-600 w-12">{task.progress ?? 0}%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Dependencies</label>
          {/* Dependency list with task and type selectors */}
          <div className="space-y-3 px-1 pr-4">
            {(task.depends_on || []).map((depId, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={depId}
                  onChange={(e) => {
                    const newDeps = [...(task.depends_on || [])];
                    newDeps[idx] = e.target.value;
                    const newTypes = new Map(dependencyTypes);
                    newTypes.set(e.target.value, dependencyTypes.get(depId) || "FS");
                    newTypes.delete(depId);
                    updateDependencies(newDeps, newTypes);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {otherTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={dependencyTypes.get(depId) || "FS"}
                  onChange={(e) => {
                    const newTypes = new Map(dependencyTypes);
                    newTypes.set(depId, e.target.value);
                    updateDependencies(task.depends_on || [], newTypes);
                  }}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                >
                  <option value="FS">FS</option>
                  <option value="SS">SS</option>
                  <option value="FF">FF</option>
                  <option value="SF">SF</option>
                </select>

                <button
                  onClick={() => {
                    const newDeps = (task.depends_on || []).filter((_, i) => i !== idx) as DependencyType[];
                    const newTypes = new Map(dependencyTypes);
                    newTypes.delete(depId);
                    updateDependencies(newDeps, newTypes);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {otherTasks.length > 0 && (
              <button
                onClick={() => {
                  const newDepId = otherTasks[0]?.id || "";
                  const newDeps = [...(task.depends_on || []), newDepId];
                  const newTypes = new Map(dependencyTypes);
                  newTypes.set(newDepId, "FS");
                  updateDependencies(newDeps, newTypes);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Dependency
              </button>
            )}
          </div>
          <div className="mt-2 px-1 text-xs text-gray-500">
            <div>FS: Finish to Start • SS: Start to Start</div>
            <div>FF: Finish to Finish • SF: Start to Finish</div>
          </div>
        </div>
      </div>
    </div>
  );
}
