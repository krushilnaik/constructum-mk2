import { GanttChart } from "./components";

interface Props {}

function App(props: Props) {
  const {} = props;

  return (
    <div className="w-screen h-screen grid grid-rows-[4rem_auto]">
      <header className="border-b px-4 py-4 flex items-center justify-between w-full">
        <div>
          <img src="/logo.png" alt="" />
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Constructum
            <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-800 text-xs font-semibold align-middle">
              Beta
            </span>
          </h1>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-md text-sm font-medium cursor-pointer border h-10 px-4 py-2">
          Sign Out
        </button>
      </header>
      <GanttChart />
    </div>
  );
}

export default App;
