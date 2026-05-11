import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import { toast } from "sonner";
import { KeyRound, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("As novas senhas não coincidem");
    }
    if (passwords.new.length < 6) {
      return toast.error("A nova senha deve ter pelo menos 6 caracteres");
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: passwords.current,
        new_password: passwords.new,
      });
      toast.success("Senha alterada com sucesso!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

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
        <Button variant="outline" onClick={logout} className="gap-2" data-testid="profile-logout">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
          <KeyRound className="w-4 h-4" /> Alterar Senha
        </div>
        <form onSubmit={handlePasswordChange} className="surface p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current">Senha Atual</Label>
              <Input
                id="current"
                type="password"
                required
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Nova Senha</Label>
              <Input
                id="new"
                type="password"
                required
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar Nova Senha</Label>
              <Input
                id="confirm"
                type="password"
                required
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Atualizar Senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
