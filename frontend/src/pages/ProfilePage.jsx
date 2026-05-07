import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="px-6 lg:px-10 py-10 max-w-3xl mx-auto" data-testid="profile-page">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Conta</div>
      <h1 className="text-4xl font-display font-black tracking-tighter mt-2">Meu perfil</h1>

      <div className="surface p-8 mt-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-display font-bold">
          {initials}
        </div>
        <div className="flex-1">
          <div className="text-xl font-display font-bold tracking-tight">{user?.name}</div>
          <div className="text-slate-500 text-sm">{user?.email}</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-semibold mt-1">{user?.role}</div>
        </div>
        <Button variant="outline" onClick={logout} data-testid="profile-logout">Sair</Button>
      </div>

      <div className="mt-6 surface p-6 text-sm text-slate-500">
        Em breve: alteração de senha, foto de perfil e preferências.
      </div>
    </div>
  );
}
