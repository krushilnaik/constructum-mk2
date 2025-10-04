import { useMemo, useRef, useState, useEffect } from "react";
import type { Segment, DependencyType, DependencyCreation } from "../types";
import { addDays, dateToX, daysBetween } from "../utils";
import { supabase } from "../supabase";
import { EditPanel, TaskBar, TaskDropdown } from ".";
import type { Task, Project } from "../types/database";

interface Props {
  project: Project;
}

export function GanttChart({ project }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dropdown, setDropdown] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const [dependencyCreation, setDependencyCreation] = useState<DependencyCreation | null>(null);
  const [dragState, setDragState] = useState<{ taskId: string; startY: number; currentY: number } | null>(null);

  // Restore selected task from localStorage
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => localStorage.getItem("gantt-selected-task") || null
  );

  // Fetch tasks and dependencies for user's projects
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksResult, dependenciesResult] = await Promise.all([
        supabase.from("tasks").select("*").eq("project_id", project.id).order("sort_order"),
        supabase.from("task_dependencies").select("*"),
      ]);

      if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);
      else setTasks(tasksResult.data || []);

      if (dependenciesResult.error) console.error("Error fetching dependencies:", dependenciesResult.error);
      else {
        const depMap = new Map<string, string>();
        (dependenciesResult.data || []).forEach((dep) => {
          depMap.set(`${dep.predecessor_task_id}-${dep.successor_task_id}`, dep.dependency_type);
        });
        setTaskDependencies(depMap);
      }

      setLoading(false);
    };
    if (project) fetchData();
  }, [project]);

  // Calculate timeline bounds from task dates
  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { minDate: today, totalDays: 1 };
    }
    const min = tasks.reduce(
      (acc, t) => (t.start_date && t.start_date < acc ? t.start_date : acc),
      tasks[0].start_date || ""
    );
    const max = tasks.reduce((acc, t) => (t.end_date && t.end_date > acc ? t.end_date : acc), tasks[0].end_date || "");
    return {
      minDate: addDays(min, -1),
      totalDays: daysBetween(addDays(min, -1), addDays(max, 1)) + 1,
    };
  }, [tasks]);

  const ppd = 45,
    panX = 0,
    rowHeight = 48,
    headerHeight = 56,
    leftColumnWidth = 220;
  const timelineWidth = totalDays * ppd;
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate layout for single project with drag reordering
  const { filteredTasks, totalRows } = useMemo(() => {
    const filtered = tasks.filter((task) => task.project_id === project.id);
    return {
      filteredTasks: filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      totalRows: filtered.length,
    };
  }, [tasks, project.id]);

  useEffect(() => {
    selectedTaskId
      ? localStorage.setItem("gantt-selected-task", selectedTaskId)
      : localStorage.removeItem("gantt-selected-task");
  }, [selectedTaskId]);

  const chartHeight = totalRows * rowHeight + headerHeight + 40;
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayX = dateToX(minDate, todayISO, ppd) + leftColumnWidth + panX;

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedAt = new Date().toISOString();
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...updates, updated_at: updatedAt } : t)));

    const { error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: updatedAt })
      .eq("id", taskId);
    if (error) console.error("Error updating task:", error);
  };

  const handleTaskResize = (taskId: string, newStartDate: string, newEndDate: string) => {
    updateTask(taskId, { start_date: newStartDate, end_date: newEndDate });
  };

  const handleDragStart = (taskId: string, startY: number) => {
    let currentDragState = { taskId, startY, currentY: startY };
    setDragState(currentDragState);
    
    const handleMouseMove = (e: MouseEvent) => {
      currentDragState = { ...currentDragState, currentY: e.clientY };
      setDragState(currentDragState);
    };
    
    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const draggedTaskIndex = filteredTasks.findIndex(t => t.id === taskId);
      const deltaY = currentDragState.currentY - currentDragState.startY;
      const newIndex = Math.max(0, Math.min(filteredTasks.length - 1, draggedTaskIndex + Math.round(deltaY / rowHeight)));
      
      // Clear drag state first to remove visual transforms
      setDragState(null);
      
      if (newIndex !== draggedTaskIndex) {
        // Wait a frame for the visual transform to clear, then update state
        requestAnimationFrame(() => {
          const reorderedTasks = [...filteredTasks];
          const [draggedTask] = reorderedTasks.splice(draggedTaskIndex, 1);
          reorderedTasks.splice(newIndex, 0, draggedTask);
          
          const updates = reorderedTasks.map((task, index) => ({
            id: task.id,
            sort_order: index
          }));
          
          // Update local state
          setTasks(prev => prev.map(t => {
            const update = updates.find(u => u.id === t.id);
            return update ? { ...t, sort_order: update.sort_order } : t;
          }));
          
          // Update database in background
          updates.forEach(async (update) => {
            const { error } = await supabase.from('tasks').update({ sort_order: update.sort_order }).eq('id', update.id);
            if (error) console.error('Database update error:', error);
          });
        });
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate dependency arrow paths between tasks with drag offsets
  const dependencySegments = useMemo(() => {
    const segments: Segment[] = [];
    const taskPositions = new Map<string, number>();

    filteredTasks.forEach((task, taskIndex) => {
      taskPositions.set(task.id, taskIndex);
    });

    // Helper function to get task Y position with drag offset
    const getTaskY = (taskId: string, baseRow: number) => {
      let yOffset = 0;
      
      if (dragState) {
        const isDragging = dragState.taskId === taskId;
        const dragOffset = isDragging ? dragState.currentY - dragState.startY : 0;
        
        if (!isDragging) {
          // Calculate if other tasks should shift
          const draggedIndex = filteredTasks.findIndex(t => t.id === dragState.taskId);
          const deltaY = dragState.currentY - dragState.startY;
          const targetIndex = Math.max(0, Math.min(filteredTasks.length - 1, draggedIndex + Math.round(deltaY / rowHeight)));
          
          if (draggedIndex < targetIndex && baseRow > draggedIndex && baseRow <= targetIndex) {
            yOffset = -rowHeight;
          } else if (draggedIndex > targetIndex && baseRow >= targetIndex && baseRow < draggedIndex) {
            yOffset = rowHeight;
          }
        } else {
          yOffset = dragOffset;
        }
      }
      
      return headerHeight + baseRow * rowHeight + rowHeight / 2 + yOffset;
    };

    for (const t of filteredTasks) {
      if (!t.depends_on?.length || !t.start_date || !t.end_date) continue;

      for (const depId of t.depends_on) {
        const source = filteredTasks.find((d) => d.id === depId);
        if (!source?.start_date || !source?.end_date) continue;

        const sourceRow = (taskPositions.get(source.id) ?? 0);
        const targetRow = (taskPositions.get(t.id) ?? 0);
        const depType = (taskDependencies.get(`${depId}-${t.id}`) || "FS") as DependencyType;

        const baseX = leftColumnWidth + panX;
        let fromX: number, toX: number, fromSide: "center" | "right", toSide: "center" | "right";

        if (depType === "FS") {
          fromX = dateToX(minDate, source.end_date, ppd) + baseX;
          toX = dateToX(minDate, t.start_date, ppd) + baseX;
          fromSide = "right";
          toSide = "center";
        } else if (depType === "SS") {
          fromX = dateToX(minDate, source.start_date, ppd) + baseX;
          toX = dateToX(minDate, t.start_date, ppd) + baseX;
          fromSide = "center";
          toSide = "center";
        } else if (depType === "FF") {
          fromX = dateToX(minDate, source.end_date, ppd) + baseX;
          toX = dateToX(minDate, t.end_date, ppd) + baseX;
          fromSide = "right";
          toSide = "right";
        } else {
          fromX = dateToX(minDate, source.start_date, ppd) + baseX;
          toX = dateToX(minDate, t.end_date, ppd) + baseX;
          fromSide = "center";
          toSide = "right";
        }

        const fromY = getTaskY(source.id, sourceRow);
        const toY = getTaskY(t.id, targetRow);

        segments.push({ fromX, fromY, toX, toY, type: depType, fromSide, toSide });
      }
    }
    return segments;
  }, [filteredTasks, ppd, panX, minDate, taskDependencies, dragState, rowHeight]);

  if (loading)
    return (
      <main className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div>Loading tasks...</div>
      </main>
    );

  return (
    <main className="w-full h-full bg-slate-100 overflow-hidden relative flex">
      {selectedTaskId && (
        <EditPanel
          task={tasks.find((t) => t.id === selectedTaskId)!}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => updateTask(selectedTaskId, updates)}
          onDependenciesUpdate={() => {
            // Refresh task dependencies from database
            supabase
              .from("task_dependencies")
              .select("*")
              .then(({ data }) => {
                const depMap = new Map<string, string>();
                (data || []).forEach((dep) => {
                  depMap.set(`${dep.predecessor_task_id}-${dep.successor_task_id}`, dep.dependency_type);
                });
                setTaskDependencies(depMap);
              });
          }}
          allTasks={tasks}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          selectedTaskId ? "ml-sidebar" : "ml-0"
        }`}
      >
        <div
          className="flex-1 max-w-screen overflow-x-scroll overflow-y-auto relative"
          onClick={() => {
            if (dependencyCreation) setDependencyCreation(null);
            if (dropdown) setDropdown(null);
          }}
        >


          <svg ref={svgRef} width={timelineWidth + leftColumnWidth} height={chartHeight}>
            {/* Chart background */}
            <rect x={0} y={0} width="100%" height="100%" fill="#ffffff" />

            {/* Task names column background */}
            <rect x={0} y={0} width={leftColumnWidth} height={chartHeight} fill="#fafafa" stroke="#eee" />

            <g transform={`translate(${leftColumnWidth + panX}, 0)`}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayISO = addDays(minDate, i);
                const isToday = dayISO === todayISO;
                return (
                  <rect
                    key={i}
                    x={i * ppd}
                    y={0}
                    width={ppd}
                    height={headerHeight}
                    fill={isToday ? "#ffe6e6" : "#fff"}
                    stroke="#eee"
                  />
                );
              })}
            </g>

            <g transform={`translate(${leftColumnWidth + panX}, ${headerHeight})`}>
              {Array.from({ length: totalRows }).map((_, r) => (
                <g key={r} transform={`translate(0, ${r * rowHeight})`}>
                  <rect x={0} y={0} width={timelineWidth} height={rowHeight} fill={r % 2 === 0 ? "#fff" : "#fbfbfb"} />
                  <line x1={0} x2={timelineWidth} y1={rowHeight} y2={rowHeight} stroke="#f0f0f0" />
                </g>
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayISO = addDays(minDate, i);
                const isToday = dayISO === todayISO;
                return (
                  <line
                    key={`grid-${i}`}
                    x1={i * ppd}
                    x2={i * ppd}
                    y1={0}
                    y2={totalRows * rowHeight}
                    stroke={isToday ? "#ff4d4f" : "#f0f0f0"}
                    strokeWidth={isToday ? 2 : 1}
                    opacity={isToday ? 0.8 : 0.3}
                  />
                );
              })}
            </g>

            {/* Dependency arrows */}
            <g>
              {dependencySegments.map((s, idx) => {
                const offset = 40;
                let pathD: string;

                if (s.type === "SS" || s.type === "SF") {
                  // For SS and SF, start from left edge and loop around
                  const leftEdgeX = s.fromX - offset;
                  const midY = (s.fromY + s.toY) / 2;

                  if (s.type === "SS") {
                    pathD = `M ${s.fromX} ${s.fromY} L ${leftEdgeX} ${s.fromY} L ${leftEdgeX} ${midY} L ${
                      s.toX - offset
                    } ${midY} L ${s.toX - offset} ${s.toY} L ${s.toX} ${s.toY}`;
                  } else {
                    // SF
                    pathD = `M ${s.fromX} ${s.fromY} L ${leftEdgeX} ${s.fromY} L ${leftEdgeX} ${midY} L ${
                      s.toX + offset
                    } ${midY} L ${s.toX + offset} ${s.toY} L ${s.toX} ${s.toY}`;
                  }
                } else if (s.type === "FF") {
                  const buffer = 10;
                  const p1 = { x: s.fromX, y: s.fromY };
                  const p2x = s.toX + offset + buffer;
                  pathD = `M ${p1.x} ${p1.y} L ${p2x - offset} ${s.fromY} C ${p2x} ${s.fromY}, ${p2x} ${
                    s.fromY + offset
                  }, ${s.toX} ${s.toY}`;
                } else {
                  const cp1x = s.fromX + offset;
                  const cp2x = s.toX - offset;
                  pathD = `M ${s.fromX} ${s.fromY} C ${cp1x} ${s.fromY} ${cp2x} ${s.toY} ${s.toX} ${s.toY}`;
                }

                return (
                  <path
                    key={idx}
                    d={pathD}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1.2}
                    strokeDasharray="4 2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </g>

            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#999" />
              </marker>
            </defs>

            {/* Today line */}
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

          {/* Timeline date headers */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayISO = addDays(minDate, i);
            const date = new Date(dayISO);
            const dayNum = date.getDate();
            const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isToday = dayISO === todayISO;
            return (
              <button
                key={i}
                className={`absolute flex flex-col items-center justify-center text-center border-r border-gray-200 ${
                  isToday ? "bg-red-50 border-red-200 shadow-sm" : "bg-white hover:bg-gray-50"
                } ${isWeekend ? "text-gray-400" : "text-gray-700"}`}
                style={{
                  left: `${leftColumnWidth + panX + i * ppd}px`,
                  top: "0px",
                  width: `${ppd}px`,
                  height: `${headerHeight}px`,
                }}
              >
                <div
                  className={`text-sm font-semibold ${
                    isToday ? "text-red-700" : isWeekend ? "text-gray-400" : "text-gray-800"
                  }`}
                >
                  {dayNum}
                </div>
                <div className={`text-xs ${isToday ? "text-red-600" : isWeekend ? "text-gray-300" : "text-gray-500"}`}>
                  {dayOfWeek}
                </div>
              </button>
            );
          })}

          {/* Render task bars */}
          {filteredTasks.map((task, taskIndex) => {
            const isDragging = dragState?.taskId === task.id;
            const dragOffset = isDragging ? dragState.currentY - dragState.startY : 0;
            
            let visualOffset = 0;
            if (dragState && dragState.taskId !== task.id) {
              const draggedIndex = filteredTasks.findIndex(t => t.id === dragState.taskId);
              const deltaY = dragState.currentY - dragState.startY;
              const targetIndex = Math.max(0, Math.min(filteredTasks.length - 1, draggedIndex + Math.round(deltaY / rowHeight)));
              
              if (draggedIndex < targetIndex && taskIndex > draggedIndex && taskIndex <= targetIndex) {
                visualOffset = -rowHeight;
              } else if (draggedIndex > targetIndex && taskIndex >= targetIndex && taskIndex < draggedIndex) {
                visualOffset = rowHeight;
              }
            }
            
            return (
              <TaskBar
                key={task.id}
                task={task}
                visualRow={taskIndex}
                minDate={minDate}
                ppd={ppd}
                leftColumnWidth={leftColumnWidth}
                panX={panX}
                headerHeight={headerHeight}
                rowHeight={rowHeight}
                selected={selectedTaskId === task.id}
                onTaskSelect={setSelectedTaskId}
                onTaskResize={handleTaskResize}
                onDropdownOpen={setDropdown}
onDragStart={handleDragStart}
                style={{
                  transform: `translateY(${dragOffset + visualOffset}px)`,
                  opacity: isDragging ? 0.6 : 1,
                  transition: isDragging ? 'none' : 'all 200ms ease-out',
                  zIndex: isDragging ? 50 : 10,
                }}
              />
            );
          })}
        </div>
      </div>

      {dropdown && (
        <TaskDropdown
          x={dropdown.x}
          y={dropdown.y}
          taskId={dropdown.taskId}
          tasks={tasks}
          onTasksUpdate={setTasks}
          onTaskSelect={setSelectedTaskId}
          onClose={() => setDropdown(null)}
        />
      )}
    </main>
  );
}
