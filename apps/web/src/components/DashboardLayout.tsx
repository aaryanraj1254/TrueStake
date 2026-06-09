import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {/* pb-24 leaves room for the mobile bottom tab bar */}
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
