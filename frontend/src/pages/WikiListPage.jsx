import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { Search, Eye, Calendar, BookOpen } from "lucide-react";

export default function WikiListPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialCat = params.get("category") || "";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(initialCat);
  const [tag, setTag] = useState("");
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync category state with URL params
  useEffect(() => {
    const cat = params.get("category") || "";
    setCategory(cat);
  }, [params]);

  useEffect(() => {
    api.get("/wiki/categories").then((r) => setCategories(r.data));
    api.get("/wiki/tags").then((r) => setTags(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (category) search.set("category", category);
    if (tag) search.set("tag", tag);
    api.get(`/wiki/articles?${search.toString()}`).then((r) => {
      setArticles(r.data);
      setLoading(false);
    });
  }, [q, category, tag]);

  // Update URL when category changes
  const updateCategory = (newCat) => {
    if (newCat) setParams({ category: newCat });
    else setParams({});
  };

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Base de conhecimento</div>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-slate-900 mt-2">Wiki Corporativa</h1>
        <p className="text-slate-500 mt-2">{articles.length} artigos {category && `em ${category}`}</p>
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por título, resumo ou tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
            data-testid="wiki-search"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip active={!category} onClick={() => updateCategory("")}>Todas</Chip>
        {categories.map((c) => (
          <Chip key={c.id || c.name} active={category === c.name} onClick={() => updateCategory(c.name)}>
            {c.name} <span className="opacity-50 ml-1">{c.article_count}</span>
          </Chip>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold mr-2 self-center">Tags:</span>
          <Chip small active={!tag} onClick={() => setTag("")}>todas</Chip>
          {tags.slice(0, 12).map((t) => (
            <Chip small key={t.name} active={tag === t.name} onClick={() => setTag(t.name)}>
              #{t.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface p-5 h-44 animate-pulse" />
        ))}
        {!loading && articles.length === 0 && (
          <div className="col-span-full surface p-10 text-center text-slate-500">
            Nenhum artigo encontrado.{" "}
            {(user?.role === "admin" || user?.role === "editor") && (
              <Link to="/wiki/novo" className="text-slate-900 underline">Criar o primeiro</Link>
            )}
          </div>
        )}
        {articles.map((a) => (
          <Link
            key={a.id}
            to={`/wiki/${a.id}`}
            className="surface p-5 flex flex-col hover:-translate-y-1 hover:shadow-sm transition-soft group"
            data-testid={`article-card-${a.id}`}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              {a.category}
            </div>
            <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 mt-2 line-clamp-2 group-hover:text-slate-700">
              {a.title}
            </h3>
            {a.summary && (
              <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">{a.summary}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-3">
              {(a.tags || []).slice(0, 4).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] font-mono bg-slate-100 text-slate-600 hover:bg-slate-200">#{t}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(a.updated_at).toLocaleDateString("pt-BR")}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {a.view_count}
              </span>
              <span className="ml-auto truncate max-w-[120px]">{a.author_name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, small }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5"} rounded-full border transition ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
      data-testid={`chip-${typeof children === "string" ? children : "filter"}`}
    >
      {children}
    </button>
  );
}
