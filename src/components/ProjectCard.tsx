import { useNavigate } from "@tanstack/react-router";
import type { Project } from "../types/database";

interface Props {
  project: Project;
}

export function ProjectCard({ project }: Props) {
  const navigate = useNavigate();

  const openGanttChart = () => {
    navigate({ to: "/project/$projectId", params: { projectId: project.id } });
  };

  const viewTodos = () => {
    navigate({ to: "/project/$projectId/todos", params: { projectId: project.id } });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateProgress = () => {
    if (!project.start_date || !project.end_date) return 0;

    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = Date.now();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 h-full flex flex-col gap-2 justify-between">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              project.status === "active"
                ? "bg-green-100 text-green-800"
                : project.status === "completed"
                ? "bg-purple-100 text-purple-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {project.status || "draft"}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{project.description || "No description provided"}</p>

        {project.start_date && project.end_date && (
          <div className="space-y-1 border-y border-[#d8d8d8] py-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Start: {formatDate(project.start_date)}</span>
              <span>Deadline: {formatDate(project.end_date)}</span>
            </div>
            <div className="w-full bg-red-500 rounded-full h-3 relative">
              <div
                className="bg-green-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openGanttChart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            Open in Scheduler
          </button>
          <button
            onClick={viewTodos}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            View Todos
          </button>
          <button className="w-full bg-red-200 hover:bg-red-300 text-red-800 text-sm font-medium py-2 px-4 rounded-md transition-colors">
            Delete
          </button>
          <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-2 px-4 rounded-md transition-colors">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
