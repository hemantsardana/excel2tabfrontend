import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@/store/auth";

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
    >
      {path}
    </svg>
  );
}

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    icon: <Icon path={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />,
  },
  {
    to: "/upload",
    label: "Upload",
    icon: <Icon path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>} />,
  },
  {
    to: "/history",
    label: "History",
    icon: <Icon path={<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>} />,
  },
];

function initials(email?: string | null): string {
  if (!email) return "EX";
  return email.slice(0, 2).toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-ink-gradient text-white">
        <div className="flex items-center gap-3 px-6 py-6">
          <img src="/exl-logo-white.svg" alt="EXL" className="h-7 w-auto" />
          <span className="h-6 w-px bg-white/20" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Excel2Tableau
          </span>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Workspace
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-500" />
                  )}
                  <span className={isActive ? "text-brand-400" : ""}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {initials(user?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.email}</div>
              <div className="text-xs capitalize text-white/50">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 w-full rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-ink-50">
        <div key={location.pathname} className="mx-auto max-w-6xl px-8 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
