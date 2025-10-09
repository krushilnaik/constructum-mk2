import { dateToX } from "../utils";
import type { Task } from "../types/database";

interface Props {
  task: Task;
  minDate: string;
  ppd: number;
  leftColumnWidth: number;
  panX: number;
  headerHeight: number;
  rowHeight: number;
  visualRow: number;
  selected: boolean;
  onTaskSelect: (id: string) => void;
  style?: React.CSSProperties;
  allTasks?: Task[];
}

export function SummaryTaskBar({
  task,
  minDate,
  ppd,
  leftColumnWidth,
  panX,
  headerHeight,
  rowHeight,
  visualRow,
  onTaskSelect,
  style,
}: Props) {
  const x = dateToX(minDate, task.start_date || "", ppd) + leftColumnWidth + panX;
  const w = Math.max(6, dateToX(minDate, task.end_date || "", ppd) - dateToX(minDate, task.start_date || "", ppd));
  const y = headerHeight + visualRow * rowHeight + rowHeight / 2 - 2;

  return (
    <div
      className="absolute cursor-pointer border-2 border-b-0 border-black h-2"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        ...style,
      }}
      onClick={() => onTaskSelect(task.id)}
    />
  );
}
