import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from "@tanstack/react-router";
import { Scheduler } from "./pages/Scheduler";
import { SignIn, SignUp, Dashboard } from "./pages";
import { Header } from "./components";

// Auth router (for unauthenticated users)
const authRootRoute = createRootRoute({
  component: () => <Outlet />,
});

const signInRoute = createRoute({
  getParentRoute: () => authRootRoute,
  path: "/signin",
  component: SignIn,
});

const signUpRoute = createRoute({
  getParentRoute: () => authRootRoute,
  path: "/signup",
  component: SignUp,
});

const authRouteTree = authRootRoute.addChildren([signInRoute, signUpRoute]);

export const authRouter = createRouter({ routeTree: authRouteTree });

// App router (for authenticated users)
const appRootRoute = createRootRoute({
  component: () => (
    <div className="w-screen h-screen grid grid-rows-[4rem_auto]">
      <Header />
      <Outlet />
    </div>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRootRoute,
  path: "/",
  component: Dashboard,
});

const schedulerRoute = createRoute({
  getParentRoute: () => appRootRoute,
  path: "/project/$projectId",
  component: Scheduler,
});

const appRouteTree = appRootRoute.addChildren([dashboardRoute, schedulerRoute]);

export const appRouter = createRouter({ routeTree: appRouteTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof authRouter | typeof appRouter;
  }
}
