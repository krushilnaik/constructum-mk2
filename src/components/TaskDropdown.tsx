import { useEffect, useRef } from 'react';
import type { Task } from '../types';
import { addDays } from '../utils';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const addTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: 'New Task',
      start: new Date().toISOString().slice(0, 10),
      end: addDays(new Date().toISOString().slice(0, 10), 1),
      progress: 0,
      row: tasks.length
    };
    onTasksUpdate([...tasks, newTask]);
    onTaskSelect(newTask.id);
    onClose();
  };

  const deleteTask = () => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    const deletedRow = taskToDelete.row ?? 0;
    const updatedTasks = tasks
      .filter(t => t.id !== taskId)
      .map(t => ({
        ...t,
        row: (t.row ?? 0) > deletedRow ? (t.row ?? 0) - 1 : t.row
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
