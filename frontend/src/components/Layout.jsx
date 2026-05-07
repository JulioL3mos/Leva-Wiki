import { useEffect, useState } from "react";
import { NavLink, useNavigate, Link, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Search,
  Settings,
  LogOut,
  Plus,
  Sparkles,
  GitBranch,
  GraduationCap,
  Wrench,
  HelpCircle,
  Car,
  Bike,
  FileText,
  ChevronRight,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import CommandPalette from "./CommandPalette";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const ICONS = { Sparkles, GitBranch, GraduationCap, Wrench, HelpCircle, Car, Bike, FileText };

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/wiki", label: "Wiki", icon: BookOpen },
  { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
];

export default function Layout({ categories = [] }) {
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initials = (user?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen"
        data-testid="app-sidebar"
      >
        <div className="px-5 pt-6 pb-4">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="sidebar-logo">
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-display font-black tracking-tighter">
              L
            </div>
            <div>
              <div className="font-display font-bold text-slate-900 leading-none tracking-tight">Portal LEVA</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">Conhecimento</div>
            </div>
          </Link>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-sm text-slate-500"
          data-testid="sidebar-search-trigger"
        >
          <Search className="w-4 h-4" />
          <span>Buscar…</span>
          <kbd className="ml-auto text-[10px] font-mono text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>

        <nav className="px-3 mt-5 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Shield className="w-4 h-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
          Categorias
        </div>
        <div className="px-3 space-y-0.5 overflow-y-auto flex-1 pb-4">
          {categories.slice(0, 12).map((c) => {
            const Icon = ICONS[c.icon] || FileText;
            return (
              <Link
                key={c.id || c.name}
                to={`/wiki?category=${encodeURIComponent(c.name)}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition group"
                data-testid={`nav-cat-${c.name}`}
              >
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" strokeWidth={1.75} />
                <span className="truncate">{c.name}</span>
                {typeof c.article_count === "number" && c.article_count > 0 && (
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">{c.article_count}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="px-3 pb-4 border-t border-slate-100 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-slate-50 transition text-left"
                data-testid="user-menu-trigger"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-slate-500">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/perfil")} data-testid="menu-profile">
                <Settings className="w-4 h-4 mr-2" /> Perfil
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                  <Users className="w-4 h-4 mr-2" /> Administração
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="menu-logout" className="text-red-600 focus:text-red-700">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/75 border-b border-slate-200/70 px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md border border-slate-200 hover:bg-slate-50"
            data-testid="topbar-search"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          {(user?.role === "admin" || user?.role === "editor") && (
            <Button
              size="sm"
              onClick={() => navigate("/wiki/novo")}
              className="bg-slate-900 hover:bg-slate-800 text-white"
              data-testid="topbar-new-article"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Novo artigo
            </Button>
          )}
        </header>
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} categories={categories} />
    </div>
  );
}
