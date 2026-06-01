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
import ThemeToggle from "./ThemeToggle";
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
  { to: "/academia", label: "Academia", icon: GraduationCap },
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
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen transition-colors duration-300"
        data-testid="app-sidebar"
      >
        <div className="px-5 pt-6 pb-4">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="sidebar-logo">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-display font-black tracking-tighter">
              L
            </div>
            <div>
              <div className="font-display font-bold text-foreground leading-none tracking-tight">Portal LEVA</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Conhecimento</div>
            </div>
          </Link>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:border-slate-300 dark:hover:border-slate-600 hover:bg-muted transition text-sm text-muted-foreground"
          data-testid="sidebar-search-trigger"
        >
          <Search className="w-4 h-4" />
          <span>Buscar…</span>
          <kbd className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Shield className="w-4 h-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Categorias
        </div>
        <div className="px-3 space-y-0.5 overflow-y-auto flex-1 pb-4">
          {categories.slice(0, 12).map((c) => {
            const Icon = ICONS[c.icon] || FileText;
            return (
              <Link
                key={c.id || c.name}
                to={`/wiki?category=${encodeURIComponent(c.name)}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition group"
                data-testid={`nav-cat-${c.name}`}
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" strokeWidth={1.75} />
                <span className="truncate">{c.name}</span>
                {typeof c.article_count === "number" && c.article_count > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">{c.article_count}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="px-3 pb-4 border-t border-border pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted transition text-left"
                data-testid="user-menu-trigger"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate text-foreground">{user?.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate uppercase tracking-wider">{user?.role}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground border-border">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => navigate("/perfil")} data-testid="menu-profile" className="hover:bg-muted cursor-pointer">
                <Settings className="w-4 h-4 mr-2" /> Perfil
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin" className="hover:bg-muted cursor-pointer">
                  <Users className="w-4 h-4 mr-2" /> Administração
                </DropdownMenuItem>
              )}
              
              <ThemeToggle />

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={logout} data-testid="menu-logout" className="text-red-600 focus:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col bg-background">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/75 border-b border-border px-6 py-3 flex items-center gap-3 transition-colors duration-300">
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md border border-input hover:bg-muted"
            data-testid="topbar-search"
          >
            <Search className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1" />
          {(user?.role === "admin" || user?.role === "editor") && (
            <Button
              size="sm"
              onClick={() => navigate("/wiki/novo")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="topbar-new-article"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Novo artigo
            </Button>
          )}
        </header>
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} categories={categories} />
    </div>
  );
}
