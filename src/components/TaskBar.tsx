import { useState } from "react";
import { dateToX } from "../utils";
import type { Task } from "../types/database";
import { SummaryTaskBar } from "./SummaryTaskBar";

interface Props {
  task: Task;
  taskIndex: number;
  minDate: string;
  ppd: number;
  leftColumnWidth: number;
  panX: number;
  headerHeight: number;
  rowHeight: number;
  selected: boolean;
  onTaskSelect: (id: string) => void;
  onTaskResize?: (taskId: string, newStartDate: string, newEndDate: string) => void;
  onDropdownOpen?: (dropdown: { x: number; y: number; taskId: string } | null) => void;
  onDragStart?: (taskId: string, startY: number) => void;
  allTasks: Task[];
  filteredTasks: Task[];
  collapsedTasks: Set<string>;
  onToggleCollapse: (taskId: string) => void;
  dragState?: { taskId: string; startY: number; currentY: number } | null;
}

export function TaskBar({
  task,
  taskIndex,
  minDate,
  ppd,
  leftColumnWidth,
  panX,
  headerHeight,
  rowHeight,
  selected,
  onTaskSelect,
  onTaskResize,
  onDropdownOpen,
  onDragStart,
  allTasks,
  filteredTasks,
  collapsedTasks,
  onToggleCollapse,
  dragState,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate indentation level
  const getIndentLevel = (t: Task): number => {
    let level = 0;
    let current = t;
    const taskMap = new Map(allTasks.map((task) => [task.id, task]));
    while (current.parent_id) {
      level++;
      current = taskMap.get(current.parent_id)!;
      if (!current) break;
    }
    return level;
  };

  const indentLevel = getIndentLevel(task);
  const hasChildren = allTasks.some((t) => t.parent_id === task.id);
  const isCollapsed = collapsedTasks.has(task.id);
  const isSummaryTask = task.task_type === "summary" || task.task_type === "sub_summary";

  // Calculate drag offsets
  const isDraggingThis = dragState?.taskId === task.id;
  const dragOffset = isDraggingThis ? dragState.currentY - dragState.startY : 0;

  let visualOffset = 0;
  if (dragState && dragState.taskId !== task.id) {
    const draggedIndex = filteredTasks.findIndex((t) => t.id === dragState.taskId);
    const deltaY = dragState.currentY - dragState.startY;
    const targetIndex = Math.max(0, Math.min(filteredTasks.length - 1, draggedIndex + Math.round(deltaY / rowHeight)));

    if (draggedIndex < targetIndex && taskIndex > draggedIndex && taskIndex <= targetIndex) {
      visualOffset = -rowHeight;
    } else if (draggedIndex > targetIndex && taskIndex >= targetIndex && taskIndex < draggedIndex) {
      visualOffset = rowHeight;
    }
  }

  const style = {
    transform: `translateY(${dragOffset + visualOffset}px)`,
    opacity: isDraggingThis ? 0.6 : 1,
    transition: isDraggingThis ? "none" : "all 200ms ease-out",
    zIndex: isDraggingThis ? 50 : 10,
  };

  const x = dateToX(minDate, task.start_date || "", ppd) + leftColumnWidth + panX;
  const w = Math.max(6, dateToX(minDate, task.end_date || "", ppd) - dateToX(minDate, task.start_date || "", ppd));
  const currentRow = taskIndex;
  const y = headerHeight + currentRow * rowHeight + 4;
  const barHeight = rowHeight - 8;

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  const handleResize = (ev: React.MouseEvent, side: "start" | "end") => {
    ev.preventDefault();
    ev.stopPropagation();

    const startX = ev.clientX;
    const originalStartDate = new Date(task.start_date || "");
    const originalEndDate = new Date(task.end_date || "");

    const handleMouseMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaDays = Math.round(deltaX / ppd);

      let newStartDate = originalStartDate;
      let newEndDate = originalEndDate;

      if (side === "start") {
        newStartDate = new Date(originalStartDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
        if (newStartDate >= originalEndDate) newStartDate = new Date(originalEndDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        newEndDate = new Date(originalEndDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
        if (newEndDate <= originalStartDate) newEndDate = new Date(originalStartDate.getTime() + 24 * 60 * 60 * 1000);
      }

      onTaskResize?.(task.id, newStartDate.toISOString().split("T")[0], newEndDate.toISOString().split("T")[0]);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleDrag = (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    const startX = ev.clientX;
    const originalStartDate = new Date(task.start_date || "");
    const originalEndDate = new Date(task.end_date || "");
    const taskDuration = originalEndDate.getTime() - originalStartDate.getTime();

    const handleMouseMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaDays = Math.round(deltaX / ppd);

      const newStartDate = new Date(originalStartDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      const newEndDate = new Date(newStartDate.getTime() + taskDuration);

      onTaskResize?.(task.id, newStartDate.toISOString().split("T")[0], newEndDate.toISOString().split("T")[0]);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const baseColor = task.color || "#3b82f6";
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 };
  };
  const rgb = hexToRgb(baseColor);

  return (
    <>
      {/* Task name and reorder handle */}
      <button
        className={`absolute grid items-center px-3 py-2 rounded-lg transition-all duration-300 ease-out transform ${
          selected
            ? "bg-blue-100 border-2 border-blue-300 shadow-md scale-105"
            : "bg-white hover:bg-gray-50 hover:shadow-lg hover:scale-102 border border-gray-200"
        } animate-in fade-in-0 slide-in-from-left-2 cursor-move`}
        style={{
          left: "8px",
          top: `${headerHeight + currentRow * rowHeight + 6}px`,
          width: `${leftColumnWidth - 16}px`,
          gridTemplateColumns: `${indentLevel * 20}px 20px 1fr`,
          ...style,
        }}
        onClick={() => {
          if (!isDragging) {
            onTaskSelect(task.id);
          }
        }}
        onContextMenu={(ev) => {
          ev.preventDefault();
          onDropdownOpen?.({ x: ev.clientX, y: ev.clientY, taskId: task.id });
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          let hasMoved = false;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = Math.abs(moveEvent.clientX - startX);
            const deltaY = Math.abs(moveEvent.clientY - startY);

            if (!hasMoved && (deltaX > 3 || deltaY > 3)) {
              hasMoved = true;
              setIsDragging(true);
              if (onDragStart) {
                onDragStart(task.id, startY);
              }
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);

            if (hasMoved) {
              setTimeout(() => {
                setIsDragging(false);
              }, 100);
            }
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }}
      >
        {/* Indentation space */}
        <div />

        {/* Collapse/expand button for summary tasks */}
        {hasChildren ? (
          <div
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(task.id);
            }}
          >
            {isCollapsed ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        ) : (
          <div className="w-4 h-6 flex flex-col justify-center items-center text-gray-400">
            <div className="w-3 h-0.5 bg-current mb-0.5 rounded-full" />
            <div className="w-3 h-0.5 bg-current mb-0.5 rounded-full" />
            <div className="w-3 h-0.5 bg-current rounded-full" />
          </div>
        )}

        <div className="text-left overflow-hidden">
          <div
            className={`text-sm transition-colors duration-200 truncate ${
              task.task_type === "summary" || task.task_type === "sub_summary" ? "font-bold" : "font-semibold"
            } ${selected ? "text-blue-800" : "text-gray-800"}`}
          >
            {task.name}
          </div>
        </div>
      </button>

      {/* Timeline task bar with progress */}
      {!isSummaryTask && (
        <div
          className={`absolute rounded-xl transition-all duration-300 ease-out group cursor-move ${
            selected ? "shadow-2xl scale-105" : "hover:shadow-xl hover:scale-102"
          } animate-in fade-in-0 slide-in-from-top-2 border border-white/20`}
          style={{
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${barHeight}px`,
            backgroundColor: baseColor,
            opacity: selected ? 1 : 0.85,
            boxShadow: selected
              ? `0 8px 32px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3), 0 0 0 2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
              : `0 4px 16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
            ...style,
          }}
          onClick={() => onTaskSelect(task.id)}
          onMouseDown={handleDrag}
        >
          {/* Task text */}
          <div className="absolute inset-0 flex flex-col justify-center px-3 text-white pointer-events-none">
            <div className="font-bold text-sm truncate drop-shadow-sm">{task.name}</div>
            <div className="text-xs opacity-80 truncate">
              {formatDate(task.start_date)} - {formatDate(task.end_date)}
            </div>
          </div>

          {/* Start resize handle */}
          <div
            className="absolute left-0 top-0 w-3 h-full cursor-ew-resize bg-white/0 hover:bg-white/20 opacity-0 hover:opacity-100 transition-all duration-200 flex items-center justify-center pointer-events-auto z-10"
            onMouseDown={(ev) => handleResize(ev, "start")}
          >
            <div className="w-0.5 h-4 bg-white/60 rounded-full" />
          </div>

          {/* End resize handle */}
          <div
            className="absolute right-0 top-0 w-3 h-full cursor-ew-resize bg-white/0 hover:bg-white/20 opacity-0 hover:opacity-100 transition-all duration-200 flex items-center justify-center pointer-events-auto z-10"
            onMouseDown={(ev) => handleResize(ev, "end")}
          >
            <div className="w-0.5 h-4 bg-white/60 rounded-full" />
          </div>
        </div>
      )}

      {/* Summary task bar */}
      {isSummaryTask && (
        <SummaryTaskBar
          task={task}
          minDate={minDate}
          ppd={ppd}
          leftColumnWidth={leftColumnWidth}
          panX={panX}
          headerHeight={headerHeight}
          rowHeight={rowHeight}
          visualRow={currentRow}
          selected={selected}
          onTaskSelect={onTaskSelect}
          allTasks={allTasks}
        />
      )}
    </>
  );
}
