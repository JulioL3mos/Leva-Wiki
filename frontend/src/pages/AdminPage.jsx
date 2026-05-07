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
import { Check, X, Shield, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);

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

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto" data-testid="admin-page">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold flex items-center gap-2">
        <Shield className="w-3 h-3" /> Administração
      </div>
      <h1 className="text-4xl font-display font-black tracking-tighter text-slate-900 mt-2">Painel administrativo</h1>
      <p className="text-slate-500 mt-2">Gerencie usuários, permissões e aprove conteúdo enviado por editores.</p>

      <Tabs defaultValue="approvals" className="mt-8">
        <TabsList>
          <TabsTrigger value="approvals" data-testid="admin-tab-approvals">
            Aprovações <Badge variant="secondary" className="ml-2 bg-slate-100">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Usuários ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-6">
          {pending.length === 0 ? (
            <div className="surface p-10 text-center text-slate-400">Nenhuma aprovação pendente.</div>
          ) : (
            <div className="surface divide-y divide-slate-100">
              {pending.map((a) => (
                <div key={a.id} className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/wiki/${a.id}`} className="font-medium text-slate-900 hover:text-slate-700 truncate flex items-center gap-2">
                      {a.title} <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">
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
          <div className="surface divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-4" data-testid={`user-row-${u.id}`}>
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {(u.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{u.name}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
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
                <div className="text-xs text-slate-400 font-mono w-28 text-right">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
