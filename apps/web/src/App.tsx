import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Scanlines } from "./components/Scanlines";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import Alerts from "./pages/Alerts";
import Dashboard from "./pages/Dashboard";
import Sports from "./pages/Sports";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Markets from "./pages/Markets";
import MyBets from "./pages/MyBets";
import Portfolio from "./pages/Portfolio";
import Profile from "./pages/Profile";
import Redeem from "./pages/Redeem";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";
import Trending from "./pages/Trending";
import Wallet from "./pages/Wallet";
import Watchlist from "./pages/Watchlist";
import Withdraw from "./pages/Withdraw";

// Note: page transitions are handled per-page by <PageTransition> (mount-in
// animation). We deliberately do NOT wrap <Routes> in AnimatePresence here —
// the motion elements live nested inside each page, so AnimatePresence could
// not track their exit and would swap pages in while still at opacity:0,
// leaving the content blank. Mount-in transitions are robust and flicker-free.
export default function App() {
  return (
    <>
      <Scanlines />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/ipl" element={<Navigate to="/sports" replace />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/tweets" element={<Navigate to="/trending" replace />} />
          <Route path="/bets" element={<MyBets />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
