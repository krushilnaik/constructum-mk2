import type { Task } from "./types";

export const sampleTasks: Task[] = [
  { id: "t1", name: "Project kickoff", start: "2025-09-01", end: "2025-09-03", progress: 100, row: 0 },
  {
    id: "t2",
    name: "Design",
    start: "2025-09-04",
    end: "2025-09-10",
    progress: 100,
    row: 1,
    dependencies: [{ id: "t1", type: "FF" }],
  },
  {
    id: "t3",
    name: "Development",
    start: "2025-09-11",
    end: "2025-09-25",
    progress: 20,
    row: 2,
    dependencies: [{ id: "t2", type: "FS" }],
  },
  {
    id: "t4",
    name: "Testing",
    start: "2025-09-26",
    end: "2025-10-02",
    progress: 0,
    row: 3,
    dependencies: [{ id: "t3", type: "FS" }],
  },
  {
    id: "t5",
    name: "Release",
    start: "2025-10-03",
    end: "2025-10-04",
    progress: 0,
    row: 4,
    dependencies: [{ id: "t4", type: "SS" }],
  },
];
