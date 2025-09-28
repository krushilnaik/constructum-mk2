import type { TodoItem } from "../types/database";

interface TodoBarProps {
  todo: TodoItem;
  taskColor: string;
  editingId: string | null;
  editContent: string;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (id: string, content: string) => void;
  onUpdate: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditContentChange: (content: string) => void;
}

export function TodoBar({
  todo,
  taskColor,
  editingId,
  editContent,
  onToggle,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditContentChange,
}: TodoBarProps) {
  const lighterColor = taskColor + "50";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-full hover:shadow-sm transition-all group"
      style={{ backgroundColor: lighterColor }}
    >
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
        style={{
          borderColor: taskColor,
          backgroundColor: todo.completed ? taskColor : "#ffffff70",
        }}
      >
        {todo.completed && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {editingId === todo.id ? (
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white"
            onKeyDown={(e) => e.key === "Enter" && onUpdate(todo.id)}
            autoFocus
          />
          <button
            onClick={() => onUpdate(todo.id)}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className={`flex-1 ${todo.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
            {todo.content}
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button
              onClick={() => onEdit(todo.id, todo.content)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 012 0v4a1 1 0 11-2 0V9zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
