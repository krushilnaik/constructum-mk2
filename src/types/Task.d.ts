export type DragTask = {
  id: string;
  type: "move" | "resize-left" | "resize-right" | "reorder";
  startClientX: number;
  startClientY?: number;
  origStart: string;
  origEnd: string;
  origRow?: number;
};
