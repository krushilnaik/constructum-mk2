import { useMemo, useRef, useState } from "react";
import type { Segment, Task, DependencyType } from "../types";
import { addDays, dateToX, daysBetween } from "../utils";
import { sampleTasks } from "../data";
import { EditPanel, TaskBar } from ".";

export function GanttChart() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dependencyCreation, setDependencyCreation] = useState<{
    fromTaskId: string;
    fromEndpoint: 'start' | 'end';
    fromX: number;
    fromY: number;
  } | null>(null);


  // Timeline bounds
  const minDate = useMemo(() => {
    const min = tasks.reduce((acc, t) => (t.start < acc ? t.start : acc), tasks[0].start);
    return addDays(min, -1);
  }, [tasks]);

  const maxDate = useMemo(() => {
    const max = tasks.reduce((acc, t) => (t.end > acc ? t.end : acc), tasks[0].end);
    return addDays(max, 1);
  }, [tasks]);

  // derived days count
  const totalDays = useMemo(() => daysBetween(minDate, maxDate) + 1, [minDate, maxDate]);

  const ppd = 60;
  const panX = 0;

  const svgRef = useRef<SVGSVGElement | null>(null);

  const rowHeight = 36;
  const headerHeight = 56;
  const leftColumnWidth = 220;

  // derived width for timeline viewport
  const timelineWidth = useMemo(() => Math.max(800, totalDays * ppd), [totalDays, ppd]);

  // compute visible rows count
  const rows = Math.max(...tasks.map((t) => t.row ?? 0)) + 1;
  const chartHeight = rows * rowHeight + headerHeight + 40;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayX = dateToX(minDate, todayISO, ppd) + leftColumnWidth + panX;

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  };

  const startDependencyCreation = (taskId: string, endpoint: 'start' | 'end') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const taskX = dateToX(minDate, endpoint === 'start' ? task.start : task.end, ppd) + leftColumnWidth + panX;
    const taskY = headerHeight + (task.row ?? 0) * rowHeight + rowHeight / 2;
    
    setDependencyCreation({
      fromTaskId: taskId,
      fromEndpoint: endpoint,
      fromX: taskX,
      fromY: taskY
    });
  };

  const completeDependencyCreation = (toTaskId: string, toEndpoint: 'start' | 'end') => {
    if (!dependencyCreation || dependencyCreation.fromTaskId === toTaskId) {
      setDependencyCreation(null);
      return;
    }

    const fromEndpoint = dependencyCreation.fromEndpoint;
    let depType: DependencyType;
    
    if (fromEndpoint === 'end' && toEndpoint === 'start') depType = 'FS';
    else if (fromEndpoint === 'start' && toEndpoint === 'start') depType = 'SS';
    else if (fromEndpoint === 'end' && toEndpoint === 'end') depType = 'FF';
    else depType = 'SF';

    const toTask = tasks.find(t => t.id === toTaskId);
    if (toTask) {
      const newDep = { id: dependencyCreation.fromTaskId, type: depType };
      const existingDeps = toTask.dependencies || [];
      const updatedDeps = [...existingDeps.filter(d => d.id !== dependencyCreation.fromTaskId), newDep];
      updateTask(toTaskId, { dependencies: updatedDeps });
    }
    
    setDependencyCreation(null);
  };

  const reorderTask = (taskId: string, newRow: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.row === newRow) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, row: newRow };
      }
      // Shift other tasks if needed
      if (t.row !== undefined && task.row !== undefined) {
        if (newRow > task.row && t.row > task.row && t.row <= newRow) {
          return { ...t, row: t.row - 1 };
        }
        if (newRow < task.row && t.row < task.row && t.row >= newRow) {
          return { ...t, row: t.row + 1 };
        }
      }
      return t;
    });
    
    setTasks(updatedTasks);
  };

  // simple dependency lines generator
  const dependencySegments = useMemo(() => {
    const segments: Segment[] = [];

    for (const t of tasks) {
      if (!t.dependencies || t.dependencies.length === 0) continue;

      const targetWidth = Math.max(6, dateToX(minDate, t.end, ppd) - dateToX(minDate, t.start, ppd));

      for (const dep of t.dependencies) {
        const source = tasks.find((d) => d.id === dep.id);
        if (!source) continue;

        const sourceWidth = Math.max(6, dateToX(minDate, source.end, ppd) - dateToX(minDate, source.start, ppd));

        let fromX: number = 0;
        let toX: number = 0;
        let fromSide: "center" | "right" = "center";
        let toSide: "center" | "right" = "center";

        // Calculate start/end points based on dependency type
        switch (dep.type) {
          case "FF": // Finish to Finish
            fromX = dateToX(minDate, source.start, ppd) + sourceWidth;
            toX = dateToX(minDate, t.start, ppd) + targetWidth;
            fromSide = "right";
            toSide = "right";
            break;
          case "FS": // Finish to Start
            fromX = dateToX(minDate, source.end, ppd);
            toX = dateToX(minDate, t.start, ppd);
            fromSide = "right";
            break;
          case "SS": // Start to Start
            fromX = dateToX(minDate, source.start, ppd);
            toX = dateToX(minDate, t.start, ppd);
            break;
          case "SF": // Start to Finish
            fromX = dateToX(minDate, source.start, ppd);
            toX = dateToX(minDate, t.end, ppd);
            toSide = "right";
            break;
        }

        fromX += leftColumnWidth + panX;
        toX += leftColumnWidth + panX;

        const fromY = headerHeight + (source.row ?? 0) * rowHeight + rowHeight / 2;
        const toY = headerHeight + (t.row ?? 0) * rowHeight + rowHeight / 2;

        segments.push({ fromX, fromY, toX, toY, type: dep.type, fromSide, toSide });
      }
    }
    return segments;
  }, [tasks, ppd, panX, minDate]);

  return (
    <main className="w-full h-full bg-slate-100 overflow-hidden relative flex">
      {selectedTaskId && (
        <EditPanel
          task={tasks.find((t) => t.id === selectedTaskId)!}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => updateTask(selectedTaskId, updates)}
          allTasks={tasks}
        />
      )}

      <div 
        className={`flex-1 overflow-auto transition-all duration-300 ease-out ${
          selectedTaskId ? 'ml-80' : 'ml-0'
        }`}

        onClick={() => {
          if (dependencyCreation) {
            setDependencyCreation(null);
          }
        }}
      >
        <svg ref={svgRef} width={Math.max(1000, timelineWidth + leftColumnWidth + 100)} height={chartHeight}>
        {/* Background */}
        <rect x={0} y={0} width="100%" height="100%" fill="#ffffff" />

        {/* Left column background */}
        <rect x={0} y={0} width={leftColumnWidth} height={chartHeight} fill="#fafafa" stroke="#eee" />

        {/* Header labels: dates */}
        <g transform={`translate(${leftColumnWidth + panX}, 0)`}>
          {/* day columns */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayISO = addDays(minDate, i);
            const date = new Date(dayISO);
            const dayNum = date.getDate();
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const x = i * ppd;
            const isToday = dayISO === todayISO;
            return (
              <g key={i} transform={`translate(${x},0)`}>
                <rect x={0} y={0} width={ppd} height={headerHeight} fill={isToday ? "#ffe6e6" : "#fff"} stroke="#eee" />
                <text x={4} y={20} fontSize={14} fill={isWeekend ? "#999" : "#333"} className="font-medium">
                  {dayNum}
                </text>
                <text x={4} y={36} fontSize={10} fill={isWeekend ? "#aaa" : "#666"}>
                  {dayOfWeek}
                </text>
              </g>
            );
          })}
        </g>

        {/* Rows + grid */}
        <g transform={`translate(${leftColumnWidth + panX}, ${headerHeight})`}>
          {Array.from({ length: rows }).map((_, r) => (
            <g key={r} transform={`translate(0, ${r * rowHeight})`}>
              <rect x={0} y={0} width={timelineWidth} height={rowHeight} fill={r % 2 === 0 ? "#fff" : "#fbfbfb"} />
              <line x1={0} x2={timelineWidth} y1={rowHeight} y2={rowHeight} stroke="#f0f0f0" />
            </g>
          ))}
        </g>

        {/* Dependencies (under bars) */}
        <g>

          {dependencySegments.map((s, idx) => {
            const offset = 40;
            let pathD: string;

            if (s.type === "FF" || s.type === "SS") {
              const buffer = 10;

              if (s.type === "SS") {
                // For SS, create path that goes around the left side
                const p1 = { x: s.fromX, y: s.fromY };
                const p2 = { x: s.toX - offset - buffer, y: s.fromY };
                const p3 = { x: s.toX - offset - buffer, y: s.toY };
                const p4 = { x: s.toX, y: s.toY };

                pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y}`;
              } else {
                // FF with curved connection
                const p1 = { x: s.fromX, y: s.fromY };
                const p2x = s.toX + offset + buffer;

                pathD = `M ${p1.x} ${p1.y} 
                            L ${p2x - offset} ${s.fromY} 
                            C ${p2x} ${s.fromY}, ${p2x} ${s.fromY + offset}, ${s.toX} ${s.toY}`;
              }
            } else {
              // Regular curved path for other dependency types
              const cp1x = s.fromSide === "right" ? s.fromX : s.fromX + offset;
              const cp2x = s.toSide === "right" ? s.toX : s.toX - offset;
              pathD = `M ${s.fromX} ${s.fromY} C ${cp1x} ${s.fromY} ${cp2x} ${s.toY} ${s.toX} ${s.toY}`;
            }

            return (
              <g key={idx}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={"#60a5fa"}
                  strokeWidth={1.2}
                  strokeDasharray={"4 2"}
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          })}
        </g>

        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#999" />
          </marker>
        </defs>

        {/* Tasks */}
        <g>
          {tasks.map((t) => (
            <TaskBar
              key={t.id}
              task={t}
              minDate={minDate}
              ppd={ppd}
              leftColumnWidth={leftColumnWidth}
              panX={panX}
              headerHeight={headerHeight}
              rowHeight={rowHeight}
              selected={selectedTaskId === t.id}
              onTaskSelect={setSelectedTaskId}
              onTaskUpdate={updateTask}
              onTaskReorder={reorderTask}
              maxRows={rows}
              timelineWidth={timelineWidth}
              onDependencyStart={startDependencyCreation}
              onDependencyEnd={completeDependencyCreation}
              isCreatingDependency={!!dependencyCreation}
            />
          ))}
        </g>

        {/* Today marker line */}
        <line
          x1={todayX}
          x2={todayX}
          y1={0}
          y2={chartHeight}
          stroke="#ff4d4f"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        </svg>
      </div>
    </main>
  );
}
