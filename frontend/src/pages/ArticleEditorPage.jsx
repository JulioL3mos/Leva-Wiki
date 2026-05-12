import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiErrorDetail } from "../lib/api";
import BlockEditor from "../components/BlockEditor";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Save, Send, FileText } from "lucide-react";
import { toast } from "sonner";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ArticleEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Geral");
  const [tagsInput, setTagsInput] = useState("");
  const [blocks, setBlocks] = useState([{ id: uid(), type: "paragraph", content: "", meta: {} }]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/wiki/categories").then((r) => setCategories(r.data));
    if (!isNew) {
      api.get(`/wiki/articles/${id}`).then((r) => {
        const a = r.data;
        setTitle(a.title);
        setSummary(a.summary || "");
        setCategory(a.category);
        setTagsInput((a.tags || []).join(", "));
        setBlocks(a.blocks?.length ? a.blocks : [{ id: uid(), type: "paragraph", content: "", meta: {} }]);
      });
    }
  }, [id, isNew]);

  const save = async (status) => {
    if (!title.trim()) {
      setError("Título obrigatório");
      return;
    }
    setSaving(true);
    setError("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title,
      summary,
      category,
      tags,
      blocks,
      status,
    };
    try {
      if (isNew) {
        const { data } = await api.post("/wiki/articles", payload);
        toast.success(status === "draft" ? "Rascunho salvo" : "Artigo enviado");
        navigate(`/wiki/${data.id}`);
      } else {
        const { data } = await api.patch(`/wiki/articles/${id}`, payload);
        toast.success("Alterações salvas");
        navigate(`/wiki/${data.id}`);
      }
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  const isEditor = user?.role === "editor";

  return (
    <div className="px-6 lg:px-10 py-10 max-w-4xl mx-auto" data-testid="article-editor">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          data-testid="editor-back"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => save("draft")} disabled={saving} data-testid="save-draft">
            <Save className="w-4 h-4 mr-1.5" /> Salvar rascunho
          </Button>
          <Button
            size="sm"
            onClick={() => save("published")}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="publish-article"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {isEditor ? "Enviar para aprovação" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-1.5">
        <FileText className="w-3 h-3" /> {isNew ? "Novo artigo" : "Editar artigo"}
      </div>

      <div className="mt-3 space-y-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do artigo…"
          className="text-3xl font-display font-black tracking-tighter h-auto py-3 border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 bg-transparent"
          data-testid="editor-title"
        />

        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumo curto (aparece nas listagens)…"
          rows={2}
          className="border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 resize-none bg-transparent"
          data-testid="editor-summary"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cat" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-2" data-testid="editor-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tags" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ex: vendas, atendimento, kpi"
              className="mt-2"
              data-testid="editor-tags"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">{error}</div>
        )}

        <div className="pt-4 border-t border-border">
          <BlockEditor blocks={blocks} onChange={setBlocks} />
        </div>
      </div>
    </div>
  );
}
