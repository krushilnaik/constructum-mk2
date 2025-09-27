import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "../supabase";
import { GanttChart } from "../components/GanttChart";
import type { Project } from "../types/database";

export function Scheduler() {
  const { projectId } = useParams({ from: "/project/$projectId" });
  const [projects, setProjects] = useState<Project[]>([]);
  // Initialize selected projects from URL param or localStorage
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(() => {
    if (projectId) return new Set([projectId]);
    const saved = localStorage.getItem('gantt-selected-projects');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Fetch user's projects and handle initial selection
  useEffect(() => {
    const fetchProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("name");
        
      if (error) console.error("Error fetching projects:", error);
      else {
        const projectData = data || [];
        setProjects(projectData);
        // Auto-select project from URL or first project if none saved
        if (projectId) {
          setSelectedProjects(new Set([projectId]));
        } else if (!localStorage.getItem('gantt-selected-projects') && projectData.length > 0) {
          setSelectedProjects(new Set([projectData[0].id]));
        }
      }
    };
    fetchProjects();
  }, [projectId]);

  // Persist selected projects to localStorage
  useEffect(() => {
    localStorage.setItem('gantt-selected-projects', JSON.stringify([...selectedProjects]));
  }, [selectedProjects]);

  return (
    <div className="flex flex-col h-full">
      {/* Project selection controls */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedProjects(new Set(projects.map(p => p.id)))}
            className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-all duration-200 transform hover:scale-105"
          >
            Select All
          </button>
          {/* Individual project toggle buttons */}
          {projects.map(project => {
            const isSelected = selectedProjects.has(project.id);
            return (
              <button
                key={project.id}
                onClick={() => {
                  const newSelected = new Set(selectedProjects);
                  isSelected ? newSelected.delete(project.id) : newSelected.add(project.id);
                  setSelectedProjects(newSelected);
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  isSelected ? "bg-blue-500 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {project.name}
              </button>
            );
          })}
          {selectedProjects.size > 0 && (
            <button
              onClick={() => setSelectedProjects(new Set())}
              className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all duration-200 transform hover:scale-105"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      
      {/* Gantt chart display */}
      <div className="flex-1">
        <GanttChart selectedProjects={selectedProjects} projects={projects} />
      </div>
    </div>
  );
}
