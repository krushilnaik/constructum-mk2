export type Task = {
  id: string;
  name: string;
  start: string; // ISO date
  end: string; // ISO date
  progress?: number; // 0-100
  row?: number; // which row it sits on
  dependencies?: Dependency[];
};

export type DragTask = {
  id: string;
  type: "move" | "resize-left" | "resize-right" | "reorder";
  startClientX: number;
  startClientY?: number;
  origStart: string;
  origEnd: string;
  origRow?: number;
};
