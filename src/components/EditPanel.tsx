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
    <div className="fixed left-0 top-0 w-80 h-full bg-white shadow-xl border-r border-gray-200 z-10 transform transition-transform duration-300 ease-out animate-in slide-in-from-left">
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Edit Task</h2>
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
            value={task.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter task name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={task.start}
              onChange={(e) => onUpdate({ start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={task.end}
              onChange={(e) => onUpdate({ end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Progress</label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={task.progress ?? 0}
              onChange={(e) => onUpdate({ progress: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-medium text-gray-600 w-12">{task.progress ?? 0}%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Dependencies</label>
          <div className="space-y-3">
            {task.dependencies?.map((dep, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={dep.id}
                  onChange={(e) => {
                    const newDeps = [...(task.dependencies || [])];
                    newDeps[idx] = { ...dep, id: e.target.value };
                    onUpdate({ dependencies: newDeps });
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
                  value={dep.type}
                  onChange={(e) => {
                    const newDeps = [...(task.dependencies || [])];
                    newDeps[idx] = { ...dep, type: e.target.value as DependencyType };
                    onUpdate({ dependencies: newDeps });
                  }}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                >
                  {DEPENDENCY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const newDeps = task.dependencies?.filter((_, i) => i !== idx) || [];
                    onUpdate({ dependencies: newDeps });
                  }}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {otherTasks.length > 0 && (
              <button
                onClick={() => {
                  const newDep = { id: otherTasks[0]?.id || "", type: "FS" as DependencyType };
                  onUpdate({ dependencies: [...(task.dependencies || []), newDep] });
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
        </div>
      </div>
    </div>
  );
}
