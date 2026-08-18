import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";

const nav = [
  { to: "/products", label: "Products" },
  { to: "/orders", label: "Orders" },
  { to: "/pre-orders", label: "Pre-Orders" },
  { to: "/messages", label: "Messages" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-fg">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-sidebar-fg/50">Admin</p>
          <p className="mt-1 text-sm font-semibold">HOUSE OF FLAGS</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 text-sidebar-fg"
                    : "text-sidebar-fg/75 hover:bg-white/5 hover:text-sidebar-fg"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Button variant="sidebar" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
