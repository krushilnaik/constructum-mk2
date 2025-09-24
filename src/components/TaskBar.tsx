import { useEffect, useRef } from "react";
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
}

export function TaskBar(props: Props) {
  const { task, minDate, ppd, leftColumnWidth, panX, headerHeight, rowHeight, selected, onTaskSelect, onTaskUpdate } =
    props;
  const draggingRef = useRef<DragTask>(null);

  useEffect(() => {
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const { id, type, startClientX, origStart, origEnd } = draggingRef.current;
      const dx = ev.clientX - startClientX;
      const daysDelta = Math.round(dx / ppd);

      if (type === "move") {
        const newStart = addDays(origStart, daysDelta);
        const dur = daysBetween(origStart, origEnd);
        const newEnd = addDays(newStart, dur);
        onTaskUpdate(id, { start: newStart, end: newEnd });
      } else if (type === "resize-left") {
        const newStart = addDays(origStart, daysDelta);
        if (new Date(newStart) >= new Date(origEnd)) return;
        onTaskUpdate(id, { start: newStart });
      } else if (type === "resize-right") {
        const newEnd = addDays(origEnd, daysDelta);
        if (new Date(newEnd) <= new Date(origStart)) return;
        onTaskUpdate(id, { end: newEnd });
      }
    };

    const onPointerUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = "auto";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [ppd, onTaskUpdate]);

  const startDrag = (ev: React.PointerEvent, type: "move" | "resize-left" | "resize-right") => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    draggingRef.current = {
      id: task.id,
      type,
      startClientX: ev.clientX,
      origStart: task.start,
      origEnd: task.end,
    };
    document.body.style.cursor = type === "move" ? "grabbing" : "ew-resize";
  };

  const x = dateToX(minDate, task.start, ppd) + leftColumnWidth + panX;
  const w = Math.max(6, dateToX(minDate, task.end, ppd) - dateToX(minDate, task.start, ppd));
  const y = headerHeight + (task.row ?? 0) * rowHeight + 6;
  const barHeight = rowHeight - 12;

  return (
    <g>
      {/* bar */}
      <g transform={`translate(${x}, ${y})`} className="transition-shadow hover:drop-shadow-lg">
        <rect
          x={0}
          y={0}
          width={w}
          height={barHeight}
          rx={4}
          fill="#60a5fa"
          stroke="#2563eb"
          onPointerDown={(ev) => startDrag(ev, "move")}
          style={{ cursor: "grab" }}
        />

        {/* progress */}
        <rect
          x={0}
          y={0}
          width={(w * (task.progress ?? 0)) / 100}
          height={barHeight}
          rx={4}
          fill="#1e40af"
          pointerEvents="none"
        />

        {/* label */}
        <text x={8} y={barHeight / 2 + 4} fontSize={12} fill="#fff" pointerEvents="none">
          {task.name}
        </text>

        {/* left resize handle */}
        <rect
          x={-6}
          y={0}
          width={6}
          height={barHeight}
          fill="#0ea5a2"
          rx={2}
          onPointerDown={(ev) => startDrag(ev, "resize-left")}
          style={{ cursor: "ew-resize" }}
        />
        {/* right resize handle */}
        <rect
          x={w}
          y={0}
          width={6}
          height={barHeight}
          fill="#0ea5a2"
          rx={2}
          onPointerDown={(ev) => startDrag(ev, "resize-right")}
          style={{ cursor: "ew-resize" }}
        />
      </g>

      {/* left column label */}
      <g
        onClick={() => onTaskSelect(task.id)}
        transform={`translate(8, ${headerHeight + (task.row ?? 0) * rowHeight + 6})`}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={0}
          y={0}
          width={leftColumnWidth - 16}
          height={rowHeight - 12}
          fill={selected ? "#e5e7eb" : "transparent"}
          rx={4}
        />
        <text x={8} y={16} fontSize={14} fill="#333" className="font-medium">
          {task.name}
        </text>
        <text x={8} y={32} fontSize={12} fill="#666">
          {task.start} → {task.end}
        </text>
      </g>
    </g>
  );
}
