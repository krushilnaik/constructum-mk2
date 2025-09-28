import { useNavigate, useRouterState } from "@tanstack/react-router";
import { SignOutButton } from "./SignOutButton";

export function Header() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  // Show back button on project pages
  const isProjectPage = routerState.location.pathname.startsWith("/project/");

  return (
    <header className="px-4 h-16 flex items-center justify-between w-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] z-10 max-w-screen">
      <div className="flex items-center gap-4">
        {/* Back to dashboard button */}
        {isProjectPage && (
          <button
            onClick={() => navigate({ to: "/" })}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8" />
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Constructum
            <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-800 text-xs font-semibold align-middle">
              Gamma
            </span>
          </h1>
        </div>
      </div>
      <div className="flex gap-2">
        <SignOutButton />
      </div>
    </header>
  );
}
