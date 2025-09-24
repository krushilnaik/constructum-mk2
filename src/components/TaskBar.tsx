import { useEffect, useRef, useState } from "react";
import type { DragTask, Task } from "../types";
import { dateToX, addDays, daysBetween } from "../utils";

interface Props {
  task: Task;
  minDate: string;
  ppd: number;
  leftColumnWidth: number;
  panX: number;
  headerHeight: number;
  rowHeight: number;
  selected: boolean;
  onTaskSelect: (id: string) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskReorder: (taskId: string, newRow: number) => void;
  maxRows: number;
  timelineWidth: number;
  onDependencyStart?: (taskId: string, endpoint: 'start' | 'end') => void;
  onDependencyEnd?: (taskId: string, endpoint: 'start' | 'end') => void;
  isCreatingDependency?: boolean;
}

export function TaskBar(props: Props) {
  const {
    task,
    minDate,
    ppd,
    leftColumnWidth,
    panX,
    headerHeight,
    rowHeight,
    selected,
    onTaskSelect,
    onTaskUpdate,
    onTaskReorder,
    maxRows,
    timelineWidth,
    onDependencyStart,
    onDependencyEnd,
    isCreatingDependency,
  } = props;
  const draggingRef = useRef<DragTask>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const {
        id,
        type,
        startClientX,
        startClientY,
        origStart,
        origEnd,
        origRow,
      } = draggingRef.current;
      const dx = ev.clientX - startClientX;
      const dy = startClientY ? ev.clientY - startClientY : 0;
      const daysDelta = Math.round(dx / ppd);

      if (type === "move") {
        const newStart = addDays(origStart, daysDelta);
        const dur = daysBetween(origStart, origEnd);
        const newEnd = addDays(newStart, dur);
        onTaskUpdate(id, { start: newStart, end: newEnd });

      } else if (type === "reorder") {
        setDragOffset({ x: dx, y: dy });
        const rowDelta = Math.round(dy / rowHeight);
        const newRow = Math.max(
          0,
          Math.min(maxRows - 1, (origRow ?? 0) + rowDelta)
        );
        onTaskReorder(id, newRow);
      }
    };

    const onPointerUp = () => {
      draggingRef.current = null;
      setDragOffset({ x: 0, y: 0 });
      document.body.style.cursor = "auto";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [ppd, onTaskUpdate, onTaskReorder, rowHeight, maxRows, dragOffset]);

  const startDrag = (
    ev: React.PointerEvent,
    type: "move" | "reorder"
  ) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    draggingRef.current = {
      id: task.id,
      type,
      startClientX: ev.clientX,
      startClientY: type === "reorder" ? ev.clientY : undefined,
      origStart: task.start,
      origEnd: task.end,
      origRow: task.row,
    };
    document.body.style.cursor = type === "move" ? "grabbing" : "ns-resize";
  };

  const x = dateToX(minDate, task.start, ppd) + leftColumnWidth + panX;
  const w = Math.max(
    6,
    dateToX(minDate, task.end, ppd) - dateToX(minDate, task.start, ppd)
  );
  const y = headerHeight + (task.row ?? 0) * rowHeight + 4;
  const barHeight = rowHeight - 8;

  const isDraggingReorder =
    draggingRef.current?.type === "reorder" &&
    draggingRef.current?.id === task.id;

  const dragY = isDraggingReorder
    ? headerHeight +
      (draggingRef.current?.origRow ?? 0) * rowHeight +
      6 +
      dragOffset.y
    : y;
  const dragX = isDraggingReorder ? x + dragOffset.x : x;

  return (
    <g>
      {/* floating preview during reorder */}
      {isDraggingReorder && (
        <g opacity={0.6} style={{ pointerEvents: "none" }}>
          {/* floating row background */}
          <rect
            x={0}
            y={dragY - 6}
            width={leftColumnWidth + timelineWidth}
            height={rowHeight}
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeDasharray="4 2"
            rx={4}
          />

          {/* floating left column */}
          <g transform={`translate(8, ${dragY})`}>
            <rect
              x={0}
              y={0}
              width={leftColumnWidth - 16}
              height={rowHeight - 12}
              fill="#e5e7eb"
              rx={4}
            />
            <rect
              x={0}
              y={4}
              width={6}
              height={rowHeight - 20}
              fill="#6b7280"
              rx={2}
            />
            <g fill="#4b5563">
              <rect x={1} y={12} width={4} height={1} rx={0.5} />
              <rect x={1} y={16} width={4} height={1} rx={0.5} />
              <rect x={1} y={20} width={4} height={1} rx={0.5} />
            </g>
            <text
              x={12}
              y={16}
              fontSize={14}
              fill="#333"
              className="font-extrabold"
            >
              {task.name}
            </text>
            <text x={12} y={32} fontSize={12} fill="#666">
              {task.start} → {task.end}
            </text>
          </g>

          {/* floating bar */}
          <g transform={`translate(${dragX}, ${dragY})`}>
            <rect
              x={0}
              y={0}
              width={w}
              height={barHeight}
              rx={4}
              fill="#93c5fd"
              stroke="#3b82f6"
            />
            <rect
              x={0}
              y={0}
              width={(w * (task.progress ?? 0)) / 100}
              height={barHeight}
              rx={4}
              fill="#3b82f6"
            />
            <text x={8} y={barHeight / 2 - 2} fontSize={12} fill="#fff">
              {task.name}
            </text>
            <text x={8} y={barHeight / 2 + 12} fontSize={10} fill="#fff" opacity={0.9}>
              {new Date(task.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        </g>
      )}

      {/* normal bar */}
      <g
        transform={`translate(${x}, ${y})`}
        className={`transition-all duration-300 ease-out hover:drop-shadow-lg animate-in fade-in-0 ${
          isDraggingReorder ? "opacity-30" : ""
        }`}
      >
        <rect
          x={0}
          y={0}
          width={w}
          height={barHeight}
          rx={4}
          fill={selected ? "rgba(75, 85, 99, 0.8)" : "rgba(107, 114, 128, 0.6)"}
          stroke={selected ? "rgba(55, 65, 81, 0.9)" : "rgba(75, 85, 99, 0.7)"}
          onPointerDown={(ev) => startDrag(ev, "move")}
          style={{ cursor: "grab" }}
          className="hover:drop-shadow-md transition-all duration-200"
        />

        {/* progress */}
        <rect
          x={0}
          y={0}
          width={(w * (task.progress ?? 0)) / 100}
          height={barHeight}
          rx={4}
          fill={selected ? "rgba(55, 65, 81, 0.9)" : "rgba(75, 85, 99, 0.8)"}
          pointerEvents="none"
        />

        {/* label */}
        <text
          x={8}
          y={barHeight / 2 - 2}
          fontSize={12}
          fill="#fff"
          pointerEvents="none"
        >
          {task.name}
        </text>
        <text
          x={8}
          y={barHeight / 2 + 12}
          fontSize={10}
          fill="#fff"
          opacity={0.9}
          pointerEvents="none"
        >
          {new Date(task.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>

        {/* start endpoint */}
        <circle
          cx={0}
          cy={barHeight / 2}
          r={4}
          fill={isCreatingDependency ? "#10b981" : "#6b7280"}
          stroke="#fff"
          strokeWidth={2}
          onClick={(ev) => {
            ev.stopPropagation();
            if (isCreatingDependency) {
              onDependencyEnd?.(task.id, 'start');
            } else {
              onDependencyStart?.(task.id, 'start');
            }
          }}
          style={{ cursor: "pointer" }}
          className="hover:fill-blue-500 transition-colors"
        />
        
        {/* end endpoint */}
        <circle
          cx={w}
          cy={barHeight / 2}
          r={4}
          fill={isCreatingDependency ? "#10b981" : "#6b7280"}
          stroke="#fff"
          strokeWidth={2}
          onClick={(ev) => {
            ev.stopPropagation();
            if (isCreatingDependency) {
              onDependencyEnd?.(task.id, 'end');
            } else {
              onDependencyStart?.(task.id, 'end');
            }
          }}
          style={{ cursor: "pointer" }}
          className="hover:fill-blue-500 transition-colors"
        />
      </g>

      {/* left column label */}
      <g
        transform={`translate(8, ${
          headerHeight + (task.row ?? 0) * rowHeight + 6
        })`}
        className={`transition-transform duration-200 ease-out ${
          isDraggingReorder ? "opacity-30" : ""
        }`}
      >
        <rect
          x={0}
          y={0}
          width={leftColumnWidth - 16}
          height={rowHeight - 12}
          fill={selected ? "#e5e7eb" : "transparent"}
          rx={4}
          onClick={() => onTaskSelect(task.id)}
          style={{ cursor: "pointer" }}
        />

        {/* drag handle */}
        <rect
          x={0}
          y={4}
          width={6}
          height={rowHeight - 20}
          fill="#9ca3af"
          rx={2}
          onPointerDown={(ev) => startDrag(ev, "reorder")}
          style={{ cursor: "ns-resize" }}
          className="hover:fill-gray-600 transition-colors"
        />

        {/* handle grip lines */}
        <g fill="#6b7280">
          <rect x={1} y={12} width={4} height={1} rx={0.5} />
          <rect x={1} y={16} width={4} height={1} rx={0.5} />
          <rect x={1} y={20} width={4} height={1} rx={0.5} />
        </g>

        <text x={12} y={20} fontSize={14} fill="#333" className="font-medium">
          {task.name}
        </text>
      </g>
    </g>
  );
}
