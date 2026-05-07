import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { BookOpen, FolderOpen, Users, Eye, ArrowUpRight, Sparkles, Clock, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => setStats(null));
  }, []);

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      <div className="animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> Bem-vindo
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-slate-900 mt-2">
          Olá, {user?.name?.split(" ")[0] || "colaborador"}.
        </h1>
        <p className="text-slate-500 mt-2 text-base max-w-2xl">
          O que você quer aprender hoje? Acesse processos, treinamentos e manuais das bandeiras
          <span className="text-slate-900 font-medium"> Renault</span>,
          <span className="text-slate-900 font-medium"> Geely</span> e
          <span className="text-slate-900 font-medium"> Bajaj</span>.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
        <Stat icon={BookOpen} label="Artigos publicados" value={stats?.total_articles ?? "—"} />
        <Stat icon={FolderOpen} label="Arquivos na biblioteca" value={stats?.files_count ?? "—"} />
        <Stat icon={Users} label="Colaboradores" value={stats?.users_count ?? "—"} />
        <Stat icon={Clock} label="Aprovações pendentes" value={stats?.pending_articles ?? "—"} highlight={(stats?.pending_articles ?? 0) > 0 && user?.role === "admin"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        {/* Recent */}
        <div className="lg:col-span-2 surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Atualizados recentemente
              </div>
              <h3 className="font-display font-bold text-xl tracking-tight mt-1">Conteúdos recentes</h3>
            </div>
            <Link to="/wiki" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1" data-testid="dash-recent-all">
              Ver tudo <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {(stats?.recent_articles || []).map((a) => (
              <li key={a.id}>
                <Link
                  to={`/wiki/${a.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-md transition"
                  data-testid={`dash-recent-${a.id}`}
                >
                  <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{a.category}</span>
                      <span>·</span>
                      <span>{new Date(a.updated_at).toLocaleDateString("pt-BR")}</span>
                      <span>·</span>
                      <span>{a.author_name}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono shrink-0">
                    <Eye className="inline w-3 h-3 mr-1" />
                    {a.view_count}
                  </div>
                </Link>
              </li>
            ))}
            {(!stats?.recent_articles || stats.recent_articles.length === 0) && (
              <li className="py-10 text-center text-sm text-slate-400">
                Nenhum artigo ainda. <Link to="/wiki/novo" className="underline text-slate-700">Crie o primeiro</Link>.
              </li>
            )}
          </ul>
        </div>

        {/* Popular */}
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Mais acessados
              </div>
              <h3 className="font-display font-bold text-xl tracking-tight mt-1">Em alta</h3>
            </div>
          </div>
          <ol className="space-y-3">
            {(stats?.popular_articles || []).slice(0, 5).map((a, i) => (
              <li key={a.id}>
                <Link
                  to={`/wiki/${a.id}`}
                  className="flex items-start gap-3 group"
                  data-testid={`dash-popular-${a.id}`}
                >
                  <div className="font-display font-black text-3xl text-slate-200 leading-none w-7 shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 group-hover:text-slate-700 truncate">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <Eye className="inline w-3 h-3 mr-1" />
                      {a.view_count} acessos · {a.category}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {(!stats?.popular_articles || stats.popular_articles.length === 0) && (
              <li className="py-6 text-sm text-slate-400 text-center">Sem dados ainda.</li>
            )}
          </ol>
        </div>
      </div>

      {/* By category */}
      {stats?.by_category && stats.by_category.length > 0 && (
        <div className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-4">Distribuição por categoria</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.by_category.map((c) => (
              <Link
                key={c.category}
                to={`/wiki?category=${encodeURIComponent(c.category)}`}
                className="surface p-4 hover:-translate-y-0.5 hover:shadow-sm transition-soft"
                data-testid={`dash-cat-${c.category}`}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{c.category}</div>
                <div className="font-display font-black text-3xl tracking-tighter text-slate-900 mt-1">
                  {c.count}
                </div>
                <div className="text-xs text-slate-500 mt-1">artigos</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`surface p-5 ${highlight ? "ring-2 ring-amber-200 bg-amber-50/50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</div>
        <Icon className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
      </div>
      <div className="font-display font-black text-3xl tracking-tighter text-slate-900 mt-2">{value}</div>
    </div>
  );
}
