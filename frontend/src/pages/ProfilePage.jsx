import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api, { API_BASE } from "../lib/api";
import { toast } from "sonner";
import { KeyRound, LogOut, Camera, User, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const fileInputRef = useRef(null);

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const fullAvatarUrl = user?.avatar_url 
    ? (user.avatar_url.startsWith("http") ? user.avatar_url : `${API_BASE.replace("/api", "")}${user.avatar_url}`)
    : null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error("O nome não pode estar vazio");
    
    setProfileLoading(true);
    try {
      await api.patch("/auth/update-profile", { name: newName });
      await refresh();
      toast.success("Perfil atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setProfileLoading(true);
    try {
      // Usar a mesma rota de upload de imagem da wiki que já é local
      const { data } = await api.post("/wiki/images/upload", formData);
      await api.patch("/auth/update-profile", { avatar_url: data.url });
      await refresh();
      toast.success("Foto de perfil atualizada!");
    } catch (err) {
      toast.error("Erro ao subir imagem");
    } finally {
      setProfileLoading(false);
    }
  };

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
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Conta</div>
      <h1 className="text-4xl font-display font-black tracking-tighter text-foreground mt-2">Meu perfil</h1>

      <div className="surface p-8 mt-8 space-y-8">
        {/* Profile Header & Avatar */}
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={fullAvatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-background rounded-full shadow-lg border border-border text-muted-foreground hover:text-foreground transition-all hover:scale-110"
              title="Mudar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="text-2xl font-display font-bold tracking-tight text-foreground">{user?.name}</div>
            <div className="text-muted-foreground">{user?.email}</div>
            <div className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mt-2">
              {user?.role}
            </div>
          </div>

          <Button variant="outline" onClick={logout} className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10" data-testid="profile-logout">
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </div>

        <hr className="border-border" />

        {/* Name Update Form */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="w-4 h-4" /> Informações Pessoais
          </div>
          <form onSubmit={handleUpdateProfile} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Seu nome"
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" disabled={profileLoading || newName === user?.name} className="gap-2">
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </form>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="mt-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
          <KeyRound className="w-4 h-4" /> Segurança
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
                className="bg-muted/30"
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
                className="bg-muted/30"
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
                className="bg-muted/30"
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
