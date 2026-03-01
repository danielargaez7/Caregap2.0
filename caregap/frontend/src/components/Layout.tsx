import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  LayoutDashboard,
  Bell,
  ClipboardList,
  MessageSquare,
  ScrollText,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/followups", label: "Followups", icon: ClipboardList },
  { to: "/agent", label: "Agent Chat", icon: MessageSquare },
  { to: "/audit-log", label: "Audit Log", icon: ScrollText },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alerts": "Alerts",
  "/followups": "Followups",
  "/agent": "Agent Chat",
  "/audit-log": "Audit Log",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const base = "/" + location.pathname.split("/")[1];
    const page = PAGE_TITLES[base] || "CareGap";
    document.title = `${page} | CareGap`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-clinical-600 rounded-lg flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                CareGap
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight">
                Chronic Care Risk Detector
              </p>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <div className="text-[11px] text-gray-500 leading-tight">
              <span className="font-medium text-gray-700">Intermountain Medical Center</span>
              <br />
              <span className="text-[10px] text-gray-400">Murray, Utah</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-clinical-50 text-clinical-700"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Dev
          </span>
          {user && (
            <span className="text-xs font-medium text-gray-600">{user}</span>
          )}
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>CareGap v1.0 &middot; HIPAA Compliant</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            System Online
          </span>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-1">
          All patient data shown is simulated for demonstration purposes. No real protected health information (PHI) is used.
        </p>
      </footer>
    </div>
  );
}
