import { dateToX } from "../utils";
import type { Task } from "../types/database";

interface Props {
  task: Task;
  visualRow?: number;
  minDate: string;
  ppd: number;
  leftColumnWidth: number;
  panX: number;
  headerHeight: number;
  rowHeight: number;
  selected: boolean;
  onTaskSelect: (id: string) => void;

  timelineWidth: number;
  onDependencyStart?: (taskId: string, endpoint: "start" | "end") => void;
  onDependencyEnd?: (taskId: string, endpoint: "start" | "end") => void;
  isCreatingDependency?: boolean;
  onDropdownOpen?: (dropdown: { x: number; y: number; taskId: string } | null) => void;
}

export function TaskBar({
  task, visualRow, minDate, ppd, leftColumnWidth, panX, headerHeight, rowHeight,
  selected, onTaskSelect, onDependencyStart, onDependencyEnd, isCreatingDependency, onDropdownOpen
}: Props) {

  const x = dateToX(minDate, task.start_date || "", ppd) + leftColumnWidth + panX;
  const w = Math.max(6, dateToX(minDate, task.end_date || "", ppd) - dateToX(minDate, task.start_date || "", ppd));
  const currentRow = visualRow ?? task.sort_order ?? 0;
  const y = headerHeight + currentRow * rowHeight + 4;
  const barHeight = rowHeight - 8;


  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  // Handle dependency connection point clicks
  const handleDependencyClick = (ev: React.MouseEvent, endpoint: "start" | "end") => {
    ev.preventDefault();
    ev.stopPropagation();
    if (isCreatingDependency) onDependencyEnd?.(task.id, endpoint);
    else onDependencyStart?.(task.id, endpoint);
  };

  const getTaskColors = () => {
    const baseColor = task.color || "#6b7280";
    return {
      bg: baseColor,
      progress: baseColor
    };
  };
  const colors = getTaskColors();

  return (
    <>
      {/* Task name and reorder handle */}
      <button
        className={`absolute flex items-center px-3 py-2 rounded-lg transition-all duration-300 ease-out transform ${
          selected 
            ? "bg-blue-100 border-2 border-blue-300 shadow-md scale-105" 
            : "bg-white hover:bg-gray-50 hover:shadow-lg hover:scale-102 border border-gray-200"
        } animate-in fade-in-0 slide-in-from-left-2`}
        style={{
          left: "8px",
          top: `${headerHeight + currentRow * rowHeight + 6}px`,
          width: `${leftColumnWidth - 16}px`,
          height: `${rowHeight - 12}px`
        }}
        onClick={() => onTaskSelect(task.id)}
        onContextMenu={(ev) => {
          ev.preventDefault();
          onDropdownOpen?.({ x: ev.clientX, y: ev.clientY, taskId: task.id });
        }}
      >
        <div
          className="w-4 h-6 flex flex-col justify-center items-center mr-3 text-gray-400"
        >
          <div className="w-3 h-0.5 bg-current mb-0.5 rounded-full" />
          <div className="w-3 h-0.5 bg-current mb-0.5 rounded-full" />
          <div className="w-3 h-0.5 bg-current rounded-full" />
        </div>
        <div className="flex-1 text-left">
          <div className={`text-sm font-semibold transition-colors duration-200 ${
            selected ? "text-blue-800" : "text-gray-800"
          }`}>{task.name}</div>
        </div>
      </button>

      {/* Timeline task bar with progress */}
      <button
        onClick={() => onTaskSelect(task.id)}
        className={`absolute rounded-lg transition-shadow duration-200 ease-out group ${
          selected 
            ? "shadow-xl" 
            : "hover:shadow-lg"
        } animate-in fade-in-0 slide-in-from-top-2`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${barHeight}px`,
          backgroundColor: colors.bg,
          opacity: selected ? 1 : 0.6,
          boxShadow: selected ? `0 0 0 2px ${colors.bg}40` : undefined
        }}
      >
        {/* Progress bar with animation */}
        <div
          className="h-full rounded-lg transition-all duration-500 ease-out"
          style={{ 
            width: `${(task.progress ?? 0)}%`,
            backgroundColor: colors.progress,
            opacity: 0.8
          }}
        />

        {/* Task text */}
        <div className="absolute inset-0 flex flex-col justify-center px-2 text-white text-xs pointer-events-none">
          <div className="font-semibold truncate">{task.name}</div>
          <div className="opacity-90 truncate text-xs">
            {formatDate(task.start_date || "")} - {formatDate(task.end_date || "")}
          </div>
        </div>
      </button>

      {/* Start dependency connection point */}
      <div
        className={`absolute w-3 h-3 rounded-full border-2 border-white cursor-pointer transition-all duration-200 transform hover:scale-125 z-10 ${
          isCreatingDependency 
            ? "bg-green-500 shadow-lg animate-pulse" 
            : "bg-gray-400 hover:bg-blue-500 hover:shadow-md"
        }`}
        style={{ left: `${x - 6}px`, top: `${y + barHeight / 2 - 6}px` }}
        onClick={(ev) => handleDependencyClick(ev, "start")}
      />

      {/* End dependency connection point */}
      <div
        className={`absolute w-3 h-3 rounded-full border-2 border-white cursor-pointer transition-all duration-200 transform hover:scale-125 z-10 ${
          isCreatingDependency 
            ? "bg-green-500 shadow-lg animate-pulse" 
            : "bg-gray-400 hover:bg-blue-500 hover:shadow-md"
        }`}
        style={{ left: `${x + w - 6}px`, top: `${y + barHeight / 2 - 6}px` }}
        onClick={(ev) => handleDependencyClick(ev, "end")}
      />
    </>
  );
}
