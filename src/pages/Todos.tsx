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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {tasks.map((task) => {
          const taskTodos = getTaskTodos(task.id);
          const taskColor = task.color || "#6b7280";
          const isCollapsed = collapsedTasks.has(task.id);

          return (
            <div key={task.id} className="space-y-2">
              {/* Task Bar */}
              <button
                onClick={() => toggleTaskCollapse(task.id)}
                className="w-full flex items-center px-4 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: taskColor }}
              >
                <svg
                  className={`w-4 h-4 mr-2 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{task.name}</span>
                <span className="ml-auto text-sm opacity-75">({taskTodos.length})</span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                }`}
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
