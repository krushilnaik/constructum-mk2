import { useMemo, useRef, useState, useEffect } from "react";
import type { Segment, DependencyType, DependencyCreation } from "../types";
import { addDays, dateToX, daysBetween } from "../utils";
import { supabase } from "../supabase";
import { EditPanel, TaskBar, TaskDropdown } from ".";
import type { Task, Project } from "../types/database";

interface Props {
  selectedProjects: Set<string>;
  projects: Project[];
}

export function GanttChart({ selectedProjects, projects }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dropdown, setDropdown] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const [dependencyCreation, setDependencyCreation] = useState<DependencyCreation | null>(null);

  // Restore selected task from localStorage
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => 
    localStorage.getItem('gantt-selected-task') || null
  );

  // Fetch tasks and dependencies for user's projects
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userProjectIds = projects.map(p => p.id);
      
      const [tasksResult, dependenciesResult] = await Promise.all([
        supabase.from("tasks").select("*").in("project_id", userProjectIds).order("sort_order"),
        supabase.from("task_dependencies").select("*")
      ]);

      if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);
      else setTasks(tasksResult.data || []);

      if (dependenciesResult.error) console.error("Error fetching dependencies:", dependenciesResult.error);
      else {
        const depMap = new Map<string, string>();
        (dependenciesResult.data || []).forEach(dep => {
          depMap.set(`${dep.predecessor_task_id}-${dep.successor_task_id}`, dep.dependency_type);
        });
        setTaskDependencies(depMap);
      }

      setLoading(false);
    };
    if (projects.length > 0) fetchData();
  }, [projects]);

  // Calculate timeline bounds from task dates
  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { minDate: today, totalDays: 1 };
    }
    const min = tasks.reduce((acc, t) => (t.start_date && t.start_date < acc ? t.start_date : acc), tasks[0].start_date || "");
    const max = tasks.reduce((acc, t) => (t.end_date && t.end_date > acc ? t.end_date : acc), tasks[0].end_date || "");
    return {
      minDate: addDays(min, -1),
      totalDays: daysBetween(addDays(min, -1), addDays(max, 1)) + 1
    };
  }, [tasks]);

  const ppd = 45, panX = 0, rowHeight = 48, headerHeight = 56, leftColumnWidth = 220;
  const timelineWidth = totalDays * ppd;
  const svgRef = useRef<SVGSVGElement>(null);

  // Group tasks by project and calculate layout
  const { filteredTasks, tasksByProject, projectSections, totalRows } = useMemo(() => {
    const filtered = selectedProjects.size === 0 ? tasks : tasks.filter(task => task.project_id && selectedProjects.has(task.project_id));
    
    const byProject = new Map<string, Task[]>();
    filtered.forEach(task => {
      const projectId = task.project_id || "unassigned";
      if (!byProject.has(projectId)) byProject.set(projectId, []);
      byProject.get(projectId)!.push(task);
    });

    const sections: Array<{ projectId: string; startRow: number; taskCount: number }> = [];
    let currentRow = 0;
    for (const [projectId, projectTasks] of byProject) {
      sections.push({ projectId, startRow: currentRow, taskCount: projectTasks.length });
      currentRow += projectTasks.length + 1;
    }

    return {
      filteredTasks: filtered,
      tasksByProject: byProject,
      projectSections: sections,
      totalRows: sections.reduce((sum, section) => sum + section.taskCount + 1, 0)
    };
  }, [tasks, selectedProjects]);



  useEffect(() => {
    selectedTaskId 
      ? localStorage.setItem('gantt-selected-task', selectedTaskId)
      : localStorage.removeItem('gantt-selected-task');
  }, [selectedTaskId]);

  const chartHeight = totalRows * rowHeight + headerHeight + 40;
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayX = dateToX(minDate, todayISO, ppd) + leftColumnWidth + panX;

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedAt = new Date().toISOString();
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates, updated_at: updatedAt } : t));
    
    const { error } = await supabase.from("tasks").update({ ...updates, updated_at: updatedAt }).eq("id", taskId);
    if (error) console.error("Error updating task:", error);
  };

  // Begin dependency creation from task endpoint
  const startDependencyCreation = (taskId: string, endpoint: "start" | "end") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.start_date || !task?.end_date) return;

    const taskX = dateToX(minDate, endpoint === "start" ? task.start_date : task.end_date, ppd) + leftColumnWidth + panX;
    const taskY = headerHeight + (task.sort_order ?? 0) * rowHeight + rowHeight / 2;

    setDependencyCreation({ fromTaskId: taskId, fromEndpoint: endpoint, fromX: taskX, fromY: taskY });
  };

  // Complete dependency creation and save to database
  const completeDependencyCreation = (toTaskId: string, toEndpoint: "start" | "end") => {
    if (!dependencyCreation || dependencyCreation.fromTaskId === toTaskId) {
      setDependencyCreation(null);
      return;
    }

    const { fromEndpoint } = dependencyCreation;
    const depType: DependencyType = 
      fromEndpoint === "end" && toEndpoint === "start" ? "FS" :
      fromEndpoint === "start" && toEndpoint === "start" ? "SS" :
      fromEndpoint === "end" && toEndpoint === "end" ? "FF" : "SF";

    const toTask = tasks.find(t => t.id === toTaskId);
    if (toTask) {
      const existingDeps = toTask.depends_on || [];
      if (!existingDeps.includes(dependencyCreation.fromTaskId)) {
        updateTask(toTaskId, { depends_on: [...existingDeps, dependencyCreation.fromTaskId] });
      }
      
      supabase.from("task_dependencies")
        .upsert({
          predecessor_task_id: dependencyCreation.fromTaskId,
          successor_task_id: toTaskId,
          dependency_type: depType
        })
        .then(() => {
          setTaskDependencies(prev => new Map(prev.set(`${dependencyCreation.fromTaskId}-${toTaskId}`, depType)));
        });
    }
    setDependencyCreation(null);
  };

  // Calculate dependency arrow paths between tasks
  const dependencySegments = useMemo(() => {
    const segments: Segment[] = [];
    const taskPositions = new Map<string, number>();
    
    projectSections.forEach(section => {
      const projectTasks = tasksByProject.get(section.projectId) || [];
      projectTasks.forEach((task, taskIndex) => {
        taskPositions.set(task.id, section.startRow + taskIndex + 1);
      });
    });

    for (const t of filteredTasks) {
      if (!t.depends_on?.length || !t.start_date || !t.end_date) continue;

      for (const depId of t.depends_on) {
        const source = filteredTasks.find(d => d.id === depId);
        if (!source?.start_date || !source?.end_date) continue;

        const sourceRow = taskPositions.get(source.id) ?? 0;
        const targetRow = taskPositions.get(t.id) ?? 0;
        const depType = taskDependencies.get(`${depId}-${t.id}`) || "FS";
        
        const baseX = leftColumnWidth + panX;
        let fromX: number, toX: number, fromSide: "center" | "right", toSide: "center" | "right";
        
        if (depType === "FS") {
          fromX = dateToX(minDate, source.end_date, ppd) + baseX;
          toX = dateToX(minDate, t.start_date, ppd) + baseX;
          fromSide = "right"; toSide = "center";
        } else if (depType === "SS") {
          fromX = dateToX(minDate, source.start_date, ppd) + baseX;
          toX = dateToX(minDate, t.start_date, ppd) + baseX;
          fromSide = "center"; toSide = "center";
        } else if (depType === "FF") {
          fromX = dateToX(minDate, source.end_date, ppd) + baseX;
          toX = dateToX(minDate, t.end_date, ppd) + baseX;
          fromSide = "right"; toSide = "right";
        } else {
          fromX = dateToX(minDate, source.start_date, ppd) + baseX;
          toX = dateToX(minDate, t.end_date, ppd) + baseX;
          fromSide = "center"; toSide = "right";
        }

        const fromY = headerHeight + sourceRow * rowHeight + rowHeight / 2;
        const toY = headerHeight + targetRow * rowHeight + rowHeight / 2;

        segments.push({ fromX, fromY, toX, toY, type: depType, fromSide, toSide });
      }
    }
    return segments;
  }, [filteredTasks, ppd, panX, minDate, projectSections, tasksByProject, taskDependencies]);

  if (loading) return <main className="w-full h-full bg-slate-100 flex items-center justify-center"><div>Loading tasks...</div></main>;

  return (
    <main className="w-full h-full bg-slate-100 overflow-hidden relative flex">
      {selectedTaskId && (
        <EditPanel
          task={tasks.find((t) => t.id === selectedTaskId)!}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => updateTask(selectedTaskId, updates)}
          onDependenciesUpdate={() => {
            // Refresh task dependencies from database
            supabase.from("task_dependencies").select("*").then(({ data }) => {
              const depMap = new Map<string, string>();
              (data || []).forEach(dep => {
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
          {/* Project section headers */}
          {projectSections.map(section => {
            const project = projects.find(p => p.id === section.projectId);
            return (
              <button
                key={`header-${section.projectId}`}
                className="absolute bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-50 hover:to-blue-100 rounded-lg px-3 py-2 font-semibold text-gray-700 hover:text-blue-700 z-10 border border-gray-300 hover:border-blue-300"
                style={{
                  left: '8px',
                  top: `${headerHeight + section.startRow * rowHeight + 6}px`,
                  width: `${leftColumnWidth + timelineWidth - 16}px`,
                  height: `${rowHeight - 12}px`,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {project?.name || "Unknown Project"}
              </button>
            );
          })}
          
          <svg
            ref={svgRef}
            width={timelineWidth + leftColumnWidth}
            height={chartHeight}
          >
            {/* Chart background */}
            <rect x={0} y={0} width="100%" height="100%" fill="#ffffff" />

            {/* Task names column background */}
            <rect
              x={0}
              y={0}
              width={leftColumnWidth}
              height={chartHeight}
              fill="#fafafa"
              stroke="#eee"
            />

            <g transform={`translate(${leftColumnWidth + panX}, 0)`}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayISO = addDays(minDate, i);
                const isToday = dayISO === todayISO;
                return (
                  <rect key={i} x={i * ppd} y={0} width={ppd} height={headerHeight} fill={isToday ? "#ffe6e6" : "#fff"} stroke="#eee" />
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
                    pathD = `M ${s.fromX} ${s.fromY} L ${leftEdgeX} ${s.fromY} L ${leftEdgeX} ${midY} L ${s.toX - offset} ${midY} L ${s.toX - offset} ${s.toY} L ${s.toX} ${s.toY}`;
                  } else { // SF
                    pathD = `M ${s.fromX} ${s.fromY} L ${leftEdgeX} ${s.fromY} L ${leftEdgeX} ${midY} L ${s.toX + offset} ${midY} L ${s.toX + offset} ${s.toY} L ${s.toX} ${s.toY}`;
                  }
                } else if (s.type === "FF") {
                  const buffer = 10;
                  const p1 = { x: s.fromX, y: s.fromY };
                  const p2x = s.toX + offset + buffer;
                  pathD = `M ${p1.x} ${p1.y} L ${p2x - offset} ${s.fromY} C ${p2x} ${s.fromY}, ${p2x} ${s.fromY + offset}, ${s.toX} ${s.toY}`;
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
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#999" />
              </marker>
            </defs>

            {/* Today line */}
            <line x1={todayX} x2={todayX} y1={0} y2={chartHeight} stroke="#ff4d4f" strokeDasharray="4 4" strokeWidth={1.5} />
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
                  isToday 
                    ? "bg-gradient-to-b from-red-50 to-red-100 border-red-200 shadow-sm" 
                    : "bg-white hover:bg-gray-50"
                } ${isWeekend ? "text-gray-400" : "text-gray-700"}`}
                style={{
                  left: `${leftColumnWidth + panX + i * ppd}px`,
                  top: "0px",
                  width: `${ppd}px`,
                  height: `${headerHeight}px`
                }}
              >
                <div className={`text-sm font-semibold ${
                  isToday ? "text-red-700" : isWeekend ? "text-gray-400" : "text-gray-800"
                }`}>
                  {dayNum}
                </div>
                <div className={`text-xs ${
                  isToday ? "text-red-600" : isWeekend ? "text-gray-300" : "text-gray-500"
                }`}>
                  {dayOfWeek}
                </div>
              </button>
            );
          })}
          
          {/* Render task bars for each project */}
          {projectSections.map(section => {
            const projectTasks = tasksByProject.get(section.projectId) || [];
            return projectTasks.map((task, taskIndex) => (
              <TaskBar
                key={task.id}
                task={task}
                visualRow={section.startRow + taskIndex + 1}
                minDate={minDate}
                ppd={ppd}
                leftColumnWidth={leftColumnWidth}
                panX={panX}
                headerHeight={headerHeight}
                rowHeight={rowHeight}
                selected={selectedTaskId === task.id}
                onTaskSelect={setSelectedTaskId}

                timelineWidth={timelineWidth}
                onDependencyStart={startDependencyCreation}
                onDependencyEnd={completeDependencyCreation}
                isCreatingDependency={!!dependencyCreation}
                onDropdownOpen={setDropdown}
              />
            ));
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
