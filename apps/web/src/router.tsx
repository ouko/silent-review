import { createBrowserRouter, Outlet, useParams, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthGuard } from "./components/AuthGuard";
import { PlayHome } from "./pages/PlayHome";
import { PlayRound } from "./pages/PlayRound";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ReviewDetail } from "./pages/ReviewDetail";
import { Status } from "./pages/Status";
import { Loading } from "./components/common/Loading";

const Browse = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Record = lazy(() => import("./pages/Record").then((m) => ({ default: m.Record })));
const Activity = lazy(() => import("./pages/Activity").then((m) => ({ default: m.Activity })));
const Profile = lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })));
const Viral = lazy(() => import("./pages/Viral").then((m) => ({ default: m.Viral })));
const InviteLanding = lazy(() => import("./pages/InviteLanding").then((m) => ({ default: m.InviteLanding })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));
const Analytics = lazy(() => import("./pages/Analytics").then((m) => ({ default: m.Analytics })));

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

function DeepLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/review/${id}`} replace />;
}

function LegacyHomeRedirect() {
  return <Navigate to="/play" replace />;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/status", element: <Status /> },
      { path: "/invite/:code", element: <LazyWrapper><InviteLanding /></LazyWrapper> },
      { path: "/review/:id", element: <ReviewDetail /> },
      { path: "/s/:id", element: <DeepLinkRedirect /> },
      {
        element: <ProtectedRoute><Outlet /></ProtectedRoute>,
        children: [
          { path: "/", element: <LegacyHomeRedirect /> },
          { path: "/play", element: <PlayHome /> },
          { path: "/play/:id", element: <PlayRound /> },
          { path: "/browse", element: <LazyWrapper><Browse /></LazyWrapper> },
          { path: "/record", element: <LazyWrapper><Record /></LazyWrapper> },
          { path: "/activity", element: <LazyWrapper><Activity /></LazyWrapper> },
          { path: "/viral", element: <LazyWrapper><Viral /></LazyWrapper> },
          { path: "/leaderboard", element: <LazyWrapper><LeaderboardPage /></LazyWrapper> },
          { path: "/profile/:id", element: <LazyWrapper><Profile /></LazyWrapper> },
          { path: "/admin", element: <LazyWrapper><Admin /></LazyWrapper> },
          { path: "/analytics", element: <LazyWrapper><Analytics /></LazyWrapper> },
        ],
      },
    ],
  },
]);
