import { useEffect, useState } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { supabase } from "./supabase";
import { authRouter, appRouter } from "./router";
import type { User } from "@supabase/supabase-js";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Redirect to signin if not on auth pages
    if (!window.location.pathname.startsWith("/sign")) {
      window.location.href = "/signin";
      return null;
    }
    return <RouterProvider router={authRouter} />;
  }

  return <RouterProvider router={appRouter} />;
}

export default App;
