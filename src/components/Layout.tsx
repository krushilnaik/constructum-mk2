import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "../supabase";
import { Header } from "./Header";
import type { User } from "@supabase/supabase-js";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return; // Don't redirect while loading auth state

    const path = window.location.pathname;

    if (!user && path !== "/" && path !== "/signin" && path !== "/signup") {
      navigate({ to: "/" });
    } else if (user && (path === "/signin" || path === "/signup")) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>
      <div className="flex-1 mt-16">
        <Outlet />
      </div>
    </div>
  );
}
