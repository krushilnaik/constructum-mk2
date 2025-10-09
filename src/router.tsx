import { createRouter, createRoute, createRootRoute } from "@tanstack/react-router";
import { Scheduler } from "./pages/Scheduler";
import { SignIn, SignUp, Dashboard, Home } from "./pages";
import { Todos } from "./pages/Todos";
import { Layout } from "./components";

const rootRoute = createRootRoute({
  component: Layout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signin",
  component: SignIn,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignUp,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});

const schedulerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project/$projectId",
  component: Scheduler,
});

const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project/$projectId/todos",
  component: Todos,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  signInRoute,
  signUpRoute,
  dashboardRoute,
  schedulerRoute,
  todosRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
