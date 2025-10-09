import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { SignOutButton } from "./SignOutButton";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [user, setUser] = useState<User | null>(null);

  const isProjectPage = routerState.location.pathname.startsWith("/project/");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="px-4 h-16 flex items-center justify-between w-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-4">
        {isProjectPage && user && (
          <button
            onClick={() => navigate({ to: "/dashboard" })}
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
        {user ? (
          <SignOutButton />
        ) : (
          <Link to="/signin" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
