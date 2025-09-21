import type { Task, DependencyType } from "../types";

interface EditPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  allTasks: Task[];
}

const DEPENDENCY_TYPES: DependencyType[] = ["FS", "FF", "SS", "SF"];

export function EditPanel({ task, onClose, onUpdate, allTasks }: EditPanelProps) {
  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  return (
    <div className="absolute left-0 top-0 w-80 h-full bg-white shadow-lg p-4 z-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Edit Task</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={task.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={task.start}
            onChange={(e) => onUpdate({ start: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={task.end}
            onChange={(e) => onUpdate({ end: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Progress (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={task.progress ?? 0}
            onChange={(e) => onUpdate({ progress: Math.min(100, Math.max(0, parseInt(e.target.value))) })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Dependencies</label>
          <div className="space-y-2">
            {task.dependencies?.map((dep, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={dep.id}
                  onChange={(e) => {
                    const newDeps = [...(task.dependencies || [])];
                    newDeps[idx] = { ...dep, id: e.target.value };
                    onUpdate({ dependencies: newDeps });
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  {otherTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={dep.type}
                  onChange={(e) => {
                    const newDeps = [...(task.dependencies || [])];
                    newDeps[idx] = { ...dep, type: e.target.value as DependencyType };
                    onUpdate({ dependencies: newDeps });
                  }}
                  className="w-20 px-3 py-2 border rounded"
                >
                  {DEPENDENCY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={() => {
                const newDep = { id: otherTasks[0]?.id || "", type: "FS" as DependencyType };
                onUpdate({ dependencies: [...(task.dependencies || []), newDep] });
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
            >
              Add Dependency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
