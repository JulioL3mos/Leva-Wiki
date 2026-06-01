import { useEffect, useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Check, X, Shield, ExternalLink, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AdminTraining from "./AdminTraining";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [resetPass, setResetPass] = useState({ userId: "", userName: "", newPassword: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadAll = async () => {
    const [u, p] = await Promise.all([
      api.get("/admin/users"),
      api.get("/admin/pending-articles"),
    ]);
    setUsers(u.data);
    setPending(p.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateRole = async (id, role) => {
    await api.patch(`/admin/users/${id}`, { role });
    toast.success("Permissão atualizada");
    loadAll();
  };

  const approve = async (id) => {
    await api.post(`/admin/articles/${id}/approve`);
    toast.success("Artigo aprovado");
    loadAll();
  };

  const reject = async (id) => {
    await api.post(`/admin/articles/${id}/reject`);
    toast.success("Artigo rejeitado");
    loadAll();
  };

  const resetPassword = async () => {
    if (resetPass.newPassword.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres");
    }
    setResetLoading(true);
    try {
      await api.patch(`/admin/users/${resetPass.userId}`, { password: resetPass.newPassword });
      toast.success(`Senha de ${resetPass.userName} alterada!`);
      setDialogOpen(false);
      setResetPass({ userId: "", userName: "", newPassword: "" });
    } catch (err) {
      toast.error("Erro ao resetar senha");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto" data-testid="admin-page">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2">
        <Shield className="w-3 h-3" /> Administração
      </div>
      <h1 className="text-4xl font-display font-black tracking-tighter text-foreground mt-2">Painel administrativo</h1>
      <p className="text-muted-foreground mt-2">Gerencie usuários, permissões e aprove conteúdo enviado por editores.</p>

      <Tabs defaultValue="approvals" className="mt-8">
        <TabsList>
          <TabsTrigger value="approvals" data-testid="admin-tab-approvals">
            Aprovações <Badge variant="secondary" className="ml-2 bg-muted">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="training" data-testid="admin-tab-training">Treinamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-6">
          {pending.length === 0 ? (
            <div className="surface p-10 text-center text-muted-foreground">Nenhuma aprovação pendente.</div>
          ) : (
            <div className="surface divide-y divide-border">
              {pending.map((a) => (
                <div key={a.id} className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/wiki/${a.id}`} className="font-medium text-foreground hover:text-primary truncate flex items-center gap-2">
                      {a.title} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">
                      Por {a.author_name} · {a.category} · {new Date(a.updated_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => reject(a.id)} className="text-red-600" data-testid={`reject-${a.id}`}>
                    <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
                  </Button>
                  <Button size="sm" onClick={() => approve(a.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid={`approve-${a.id}`}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="surface divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-4" data-testid={`user-row-${u.id}`}>
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                  {(u.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <Select value={u.role} onValueChange={(v) => updateRole(u.id, v)}>
                  <SelectTrigger className="w-32" data-testid={`role-select-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground font-mono w-28 text-right">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setResetPass({ userId: u.id, userName: u.name, newPassword: "" });
                    setDialogOpen(true);
                  }}
                >
                  <KeyRound className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <AdminTraining />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Alterando a senha para o usuário: <strong className="text-foreground">{resetPass.userName}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="admin-new-pass">Nova Senha</Label>
              <Input
                id="admin-new-pass"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={resetPass.newPassword}
                onChange={(e) => setResetPass({ ...resetPass, newPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={resetPassword} disabled={resetLoading}>
              {resetLoading ? "Salvando..." : "Confirmar Nova Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
