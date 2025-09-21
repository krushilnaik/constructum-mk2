export type DependencyType = "FS" | "SS" | "FF" | "SF"; // Finish-Start, Start-Start, Finish-Finish

export type Dependency = {
  id: string;
  type: DependencyType;
};

export type Segment = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: DependencyType;
  fromSide?: "center" | "right";
  toSide?: "center" | "right";
};
