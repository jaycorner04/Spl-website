import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";

import BackendReconnectBanner from "../components/common/BackendReconnectBanner";
import ProtectedAdminRoute from "./ProtectedAdminRoute";

const HomePage = lazy(() => import("../pages/public/HomePage"));
const FixturesPage = lazy(() => import("../pages/public/FixturesPage"));
const TeamsPage = lazy(() => import("../pages/public/TeamsPage"));
const PlayersPage = lazy(() => import("../pages/public/PlayersPage"));
const LiveScorePage = lazy(() => import("../pages/public/LiveScorePage"));
const TeamDetailPage = lazy(() => import("../pages/public/TeamDetailPage"));
const PlayerDetailPage = lazy(() => import("../pages/public/PlayerDetailPage"));
const VenuesPage = lazy(() => import("../pages/public/VenuesPage"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("../pages/admin/AdminAnalytics"));
const AdminAnnouncementsPage = lazy(() =>
  import("../pages/admin/AdminAnnouncementsPage")
);
const ChangePasswordPage = lazy(() =>
  import("../pages/admin/ChangePasswordPage")
);
const MatchManagement = lazy(() => import("../pages/admin/MatchManagement"));
const PlayerManagement = lazy(() => import("../pages/admin/PlayerManagement"));
const FinanceDashboard = lazy(() => import("../pages/admin/FinanceDashboard"));
const AdminTeamsPage = lazy(() => import("../pages/admin/AdminTeamsPage"));
const AdminFranchisesPage = lazy(() =>
  import("../pages/admin/AdminFranchisesPage")
);
const AdminSponsorsPage = lazy(() =>
  import("../pages/admin/AdminSponsorsPage")
);
const AdminApprovalsPage = lazy(() =>
  import("../pages/admin/AdminApprovalsPage")
);
const LiveMatchControlPage = lazy(() =>
  import("../pages/admin/LiveMatchControlPage")
);
const AdminAuctionPage = lazy(() => import("../pages/admin/AdminAuctionPage"));

const FranchiseDashboard = lazy(() =>
  import("../pages/franchise/FranchiseDashboard")
);

const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage")
);
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage")
);

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10 text-sm text-slate-500">
      Loading page...
    </div>
  );
}

export default function AppRouter() {
  return (
    <>
      <BackendReconnectBanner />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/fixtures" element={<FixturesPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:teamId" element={<TeamDetailPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:playerId" element={<PlayerDetailPage />} />
            <Route path="/live" element={<LiveScorePage />} />
            <Route path="/venues" element={<VenuesPage />} />
          </Route>

          <Route
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route
              path="/admin/announcements"
              element={<AdminAnnouncementsPage />}
            />
            <Route
              path="/admin/change-password"
              element={<ChangePasswordPage />}
            />
            <Route
              path="/admin/franchise"
              element={<Navigate to="/admin/franchises" replace />}
            />
            <Route path="/admin/live-match" element={<LiveMatchControlPage />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/matches" element={<MatchManagement />} />
            <Route path="/admin/players" element={<PlayerManagement />} />
            <Route path="/admin/finance" element={<FinanceDashboard />} />
            <Route path="/admin/teams" element={<AdminTeamsPage />} />
            <Route path="/admin/franchises" element={<AdminFranchisesPage />} />
            <Route path="/admin/sponsors" element={<AdminSponsorsPage />} />
            <Route
              path="/franchises"
              element={<Navigate to="/admin/franchises" replace />}
            />
            <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
            <Route path="/admin/auction" element={<AdminAuctionPage />} />
            <Route path="/franchise" element={<FranchiseDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
