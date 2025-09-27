import { useEffect, useRef } from 'react';
import { addDays } from '../utils';
import type { Task } from '../types/database';

interface TaskDropdownProps {
  x: number;
  y: number;
  taskId: string;
  tasks: Task[];
  onTasksUpdate: (tasks: Task[]) => void;
  onTaskSelect: (taskId: string) => void;
  onClose: () => void;
}

export function TaskDropdown({ x, y, taskId, tasks, onTasksUpdate, onTaskSelect, onClose }: TaskDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Create new task with default values
  const addTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      project_id: tasks[0]?.project_id || '',
      name: 'New Task',
      description: null,
      duration_days: 1,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: addDays(new Date().toISOString().slice(0, 10), 1),
      parent_id: null,
      task_type: 'task',
      depends_on: [],
      crew_size: 1,
      progress: 0,
      is_critical: false,
      color: '#6b7280',
      sort_order: tasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onTasksUpdate([...tasks, newTask]);
    onTaskSelect(newTask.id);
    onClose();
  };

  // Delete task and reorder remaining tasks
  const deleteTask = () => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    const deletedSortOrder = taskToDelete.sort_order ?? 0;
    const updatedTasks = tasks
      .filter(t => t.id !== taskId)
      .map(t => ({
        ...t,
        sort_order: (t.sort_order ?? 0) > deletedSortOrder ? (t.sort_order ?? 0) - 1 : t.sort_order
      }));
    
    onTasksUpdate(updatedTasks);
    onClose();
  };

  const editTask = () => {
    onTaskSelect(taskId);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
      style={{ 
        left: x, 
        top: y,
        transformOrigin: 'top left',
        animation: 'dropdownIn 0.15s ease-out'
      }}
    >
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 whitespace-nowrap"
        onClick={editTask}
      >
        Edit Task
      </button>
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 whitespace-nowrap"
        onClick={addTask}
      >
        Add Task
      </button>
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 whitespace-nowrap"
        onClick={deleteTask}
      >
        Delete Task
      </button>
    </div>
  );
}
