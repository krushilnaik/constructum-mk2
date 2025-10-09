import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "../supabase";
import { TodoBar } from "../components/TodoBar";
import type { TodoItem, Task } from "../types/database";

export function Todos() {
  const { projectId } = useParams({ from: "/project/$projectId/todos" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodos, setNewTodos] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{ taskId: string; startY: number; currentY: number } | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchTodos();
  }, [projectId]);

  const fetchTasks = async () => {
    const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("sort_order");
    setTasks(data || []);
  };

  const fetchTodos = async () => {
    const { data } = await supabase
      .from("todo_items")
      .select("*")
      .in(
        "task_id",
        tasks.map((t) => t.id)
      )
      .order("created_at");
    setTodos(data || []);
  };

  useEffect(() => {
    if (tasks.length > 0) fetchTodos();
  }, [tasks]);

  const addTodo = async (taskId: string) => {
    const content = newTodos[taskId]?.trim();
    if (!content) return;

    const { data } = await supabase.from("todo_items").insert({ task_id: taskId, content }).select().single();

    if (data) {
      setTodos([...todos, data]);
      setNewTodos({ ...newTodos, [taskId]: "" });
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const { data } = await supabase.from("todo_items").update({ completed }).eq("id", id).select().single();

    if (data) {
      setTodos(todos.map((todo) => (todo.id === id ? data : todo)));
    }
  };

  const updateTodo = async (id: string) => {
    if (!editContent.trim()) return;

    const { data } = await supabase.from("todo_items").update({ content: editContent }).eq("id", id).select().single();

    if (data) {
      setTodos(todos.map((todo) => (todo.id === id ? data : todo)));
      setEditingId(null);
      setEditContent("");
    }
  };

  const getTaskTodos = (taskId: string) => todos.filter((todo) => todo.task_id === taskId);

  const deleteTodo = async (id: string) => {
    await supabase.from("todo_items").delete().eq("id", id);
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const toggleTaskCollapse = (taskId: string) => {
    const newCollapsed = new Set(collapsedTasks);
    if (newCollapsed.has(taskId)) {
      newCollapsed.delete(taskId);
    } else {
      newCollapsed.add(taskId);
    }
    setCollapsedTasks(newCollapsed);
  };

  // Build task hierarchy and filter out collapsed children
  const getVisibleTasks = () => {
    const allTasks = tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));
    const visibleTasks: Task[] = [];

    const isChildOfCollapsed = (task: Task): boolean => {
      let current = task;
      while (current.parent_id) {
        if (collapsedTasks.has(current.parent_id)) return true;
        current = taskMap.get(current.parent_id)!;
        if (!current) break;
      }
      return false;
    };

    for (const task of allTasks) {
      if (!isChildOfCollapsed(task)) {
        visibleTasks.push(task);
      }
    }

    return visibleTasks;
  };

  const getIndentLevel = (task: Task): number => {
    let level = 0;
    let current = task;
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    while (current.parent_id) {
      level++;
      current = taskMap.get(current.parent_id)!;
      if (!current) break;
    }
    return level;
  };

  const hasChildren = (taskId: string) => tasks.some((t) => t.parent_id === taskId);
  const isSummaryTask = (task: Task) => task.task_type === "summary" || task.task_type === "sub_summary";

  const handleDragStart = (taskId: string, startY: number) => {
    let currentDragState = { taskId, startY, currentY: startY };
    setDragState(currentDragState);

    const handleMouseMove = (e: MouseEvent) => {
      currentDragState = { ...currentDragState, currentY: e.clientY };
      setDragState(currentDragState);
    };

    const handleMouseUp = async () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const visibleTasks = getVisibleTasks();
      const draggedTaskIndex = visibleTasks.findIndex((t) => t.id === taskId);
      const deltaY = currentDragState.currentY - currentDragState.startY;
      const rowHeight = 80;
      let newIndex = Math.max(0, Math.min(visibleTasks.length - 1, draggedTaskIndex + Math.round(deltaY / rowHeight)));

      setDragState(null);

      if (newIndex !== draggedTaskIndex) {
        const draggedTask = visibleTasks[draggedTaskIndex];
        const getTaskAndChildren = (task: Task): Task[] => {
          const children = tasks.filter((t) => t.parent_id === task.id);
          return [task, ...children.flatMap(getTaskAndChildren)];
        };

        const taskGroup = getTaskAndChildren(draggedTask);
        const taskGroupIds = new Set(taskGroup.map((t) => t.id));

        // Remove task group from visible tasks
        const remainingTasks = visibleTasks.filter((t) => !taskGroupIds.has(t.id));

        // Adjust new index for removed tasks
        const adjustedIndex = Math.min(newIndex, remainingTasks.length);

        // Insert task group at new position
        const reorderedTasks = [...remainingTasks];
        reorderedTasks.splice(adjustedIndex, 0, ...taskGroup.filter((t) => visibleTasks.includes(t)));

        const updates = reorderedTasks.map((task, index) => ({
          id: task.id,
          sort_order: index,
        }));

        const updatedTasks = tasks.map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, sort_order: update.sort_order } : t;
        });
        setTasks(updatedTasks);

        updates.forEach(async (update) => {
          await supabase.from("tasks").update({ sort_order: update.sort_order }).eq("id", update.id);
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const visibleTasks = getVisibleTasks();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-2">
        {visibleTasks.map((task, taskIndex) => {
          const taskTodos = getTaskTodos(task.id);
          const taskColor = task.color || "#6b7280";
          const isCollapsed = collapsedTasks.has(task.id);
          const indentLevel = getIndentLevel(task);
          const taskHasChildren = hasChildren(task.id);
          const isTaskSummary = isSummaryTask(task);
          const draggedTask = dragState ? visibleTasks.find((t) => t.id === dragState.taskId) : null;
          const getTaskAndChildren = (t: Task): Task[] => {
            const children = tasks.filter((child) => child.parent_id === t.id);
            return [t, ...children.flatMap(getTaskAndChildren)];
          };

          const draggedGroup = draggedTask ? getTaskAndChildren(draggedTask) : [];
          const isDraggedOrChild = draggedGroup.some((t) => t.id === task.id);
          const dragOffset = isDraggedOrChild && dragState ? dragState.currentY - dragState.startY : 0;

          let visualOffset = 0;
          if (dragState && dragState.taskId !== task.id) {
            const draggedTask = visibleTasks.find((t) => t.id === dragState.taskId);
            const getTaskAndChildren = (t: Task): Task[] => {
              const children = tasks.filter((child) => child.parent_id === t.id);
              return [t, ...children.flatMap(getTaskAndChildren)];
            };

            const draggedGroup = draggedTask ? getTaskAndChildren(draggedTask) : [];
            const draggedGroupIds = new Set(draggedGroup.map((t) => t.id));
            const isDraggedOrChild = draggedGroupIds.has(task.id);

            if (!isDraggedOrChild) {
              const draggedIndex = visibleTasks.findIndex((t) => t.id === dragState.taskId);
              const deltaY = dragState.currentY - dragState.startY;
              const rowHeight = 80;
              const targetIndex = Math.max(
                0,
                Math.min(visibleTasks.length - 1, draggedIndex + Math.round(deltaY / rowHeight))
              );

              if (draggedIndex < targetIndex && taskIndex > draggedIndex && taskIndex <= targetIndex) {
                visualOffset = -80 * draggedGroup.filter((t) => visibleTasks.includes(t)).length;
              } else if (draggedIndex > targetIndex && taskIndex >= targetIndex && taskIndex < draggedIndex) {
                visualOffset = 80 * draggedGroup.filter((t) => visibleTasks.includes(t)).length;
              }
            }
          }

          return (
            <div
              key={task.id}
              className="space-y-2 transition-transform duration-200"
              style={{
                transform: `translateY(${dragOffset + visualOffset}px)`,
                opacity: isDraggedOrChild ? 0.6 : 1,
                zIndex: isDraggedOrChild ? 50 : 10,
              }}
            >
              {/* Task Bar */}
              <div className="flex items-center" style={{ marginLeft: `${indentLevel * 24}px` }}>
                <div
                  className={`flex items-center px-4 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity cursor-move ${
                    isTaskSummary ? "font-bold" : "font-medium"
                  }`}
                  style={{
                    backgroundColor: taskColor,
                    width: `calc(100% - ${indentLevel * 24}px)`,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDragStart(task.id, e.clientY);
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskCollapse(task.id);
                    }}
                    className="mr-2 hover:bg-white/20 rounded p-1 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div className="mr-3 opacity-60 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      <path d="M6 6a2 2 0 110-4 2 2 0 010 4zM6 12a2 2 0 110-4 2 2 0 010 4zM6 18a2 2 0 110-4 2 2 0 010 4z" />
                      <path d="M14 6a2 2 0 110-4 2 2 0 010 4zM14 12a2 2 0 110-4 2 2 0 010 4zM14 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </div>
                  <span className="flex-1">{task.name}</span>
                  <span className="text-sm opacity-75">({taskTodos.length})</span>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out`}
                style={{
                  marginLeft: `${indentLevel * 24}px`,
                  maxHeight: isCollapsed ? "0px" : "1000px",
                  opacity: isCollapsed ? 0 : 1,
                }}
              >
                {/* Add Todo Input */}
                <div className="ml-6 mb-2">
                  <div
                    className="flex items-center gap-3 px-4 py-2 rounded-full hover:shadow-sm transition-all"
                    style={{ backgroundColor: taskColor + "20" }}
                  >
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: taskColor }}></div>
                    <input
                      type="text"
                      value={newTodos[task.id] || ""}
                      onChange={(e) => setNewTodos({ ...newTodos, [task.id]: e.target.value })}
                      placeholder="Add a new todo..."
                      className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none"
                      onKeyPress={(e) => e.key === "Enter" && addTodo(task.id)}
                    />
                    <button
                      onClick={() => addTodo(task.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Add"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Todos */}
                <div className="ml-6 space-y-1">
                  {taskTodos.map((todo) => (
                    <TodoBar
                      key={todo.id}
                      todo={todo}
                      taskColor={taskColor}
                      editingId={editingId}
                      editContent={editContent}
                      onToggle={toggleTodo}
                      onEdit={(id, content) => {
                        setEditingId(id);
                        setEditContent(content);
                      }}
                      onUpdate={updateTodo}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={deleteTodo}
                      onEditContentChange={setEditContent}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
