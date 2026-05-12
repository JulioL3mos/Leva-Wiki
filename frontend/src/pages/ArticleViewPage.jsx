import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { renderBlocks } from "../components/BlockEditor";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ChevronLeft, Edit3, Eye, Clock, History, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ArticleViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    // Fetch article data
    api.get(`/wiki/articles/${id}`).then((r) => setArticle(r.data)).catch(() => setArticle(false));

    // Increment view count only once per mount
    if (!viewedRef.current) {
      api.post(`/wiki/articles/${id}/view`).catch(console.error);
      viewedRef.current = true;
    }
  }, [id]);

  const loadVersions = async () => {
    if (versions.length === 0) {
      const { data } = await api.get(`/wiki/articles/${id}/versions`);
      setVersions(data);
    }
    setShowVersions(true);
  };

  const handleDelete = async () => {
    if (!window.confirm("Excluir este artigo permanentemente?")) return;
    await api.delete(`/wiki/articles/${id}`);
    toast.success("Artigo excluído");
    navigate("/wiki");
  };

  if (article === null) {
    return <div className="p-12 text-muted-foreground">Carregando…</div>;
  }
  if (article === false) {
    return <div className="p-12 text-muted-foreground">Artigo não encontrado.</div>;
  }

  const canEdit = user?.role === "admin" || user?.role === "editor";

  return (
    <div className="px-6 lg:px-10 py-10 max-w-4xl mx-auto" data-testid="article-view">
      <Link to="/wiki" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground group" data-testid="back-to-wiki">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" /> Voltar para a Wiki
      </Link>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2">
          <span>{article.category}</span>
          {article.status !== "published" && (
            <Badge variant="outline" className="text-[10px]">{article.status}</Badge>
          )}
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-foreground mt-3 leading-[1.05]">
          {article.title}
        </h1>
        {article.summary && (
          <p className="text-lg text-muted-foreground mt-3 leading-relaxed max-w-3xl">{article.summary}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mt-5 pb-5 border-b border-border">
          <span>Por <span className="text-foreground font-medium">{article.author_name}</span></span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(article.updated_at).toLocaleDateString("pt-BR")}</span>
          <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {article.view_count} acessos</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={loadVersions} data-testid="btn-versions" className="bg-background">
              <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/wiki/${id}/editar`)} data-testid="btn-edit" className="bg-background">
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 bg-background border-red-100 hover:bg-red-50 dark:hover:bg-red-950" data-testid="btn-delete">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-5">
            {article.tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-xs bg-muted text-muted-foreground hover:bg-muted/80">#{t}</Badge>
            ))}
          </div>
        )}
      </div>

      <article className="prose-leva dark:prose-invert mt-10 pb-20">
        {renderBlocks(article.blocks)}
      </article>

      {showVersions && (
        <div className="surface p-6 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg tracking-tight text-foreground">Histórico de versões</h3>
            <button onClick={() => setShowVersions(false)} className="text-sm text-muted-foreground hover:text-foreground">Fechar</button>
          </div>
          <ul className="divide-y divide-border">
            {versions.map((v) => (
              <li key={v.id} className="py-3 flex items-center gap-4 text-sm">
                <span className="font-mono text-muted-foreground w-12">v{v.version}</span>
                <span className="flex-1 truncate text-foreground/80">{v.title}</span>
                <span className="text-muted-foreground">{v.edited_by_name}</span>
                <span className="text-muted-foreground/60 text-xs">{new Date(v.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
