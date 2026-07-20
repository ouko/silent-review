import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ToastContainer } from "../common/Toast";
import { useUIStore } from "../../stores/uiStore";

export function MainLayout() {
  const showBottomNav = useUIStore((s) => s.showBottomNav);

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
      <ToastContainer />
    </div>
  );
}
