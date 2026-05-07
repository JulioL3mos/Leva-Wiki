import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { BookOpen, FolderOpen, LayoutDashboard, Plus, FileText } from "lucide-react";
import api from "../lib/api";

export default function CommandPalette({ open, onOpenChange, categories = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/wiki/articles?q=${encodeURIComponent(query)}&limit=8`);
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const go = (path) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar artigos, categorias, ações…"
        value={query}
        onValueChange={setQuery}
        data-testid="command-palette-input"
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Artigos">
            {results.map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => go(`/wiki/${r.id}`)}
                data-testid={`palette-article-${r.id}`}
                value={`article-${r.id}-${r.title}`}
              >
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-sm">{r.title}</span>
                  <span className="text-xs text-slate-500">{r.category}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/")} value="goto-dashboard">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/wiki")} value="goto-wiki">
            <BookOpen className="w-4 h-4 mr-2" /> Wiki
          </CommandItem>
          <CommandItem onSelect={() => go("/biblioteca")} value="goto-files">
            <FolderOpen className="w-4 h-4 mr-2" /> Biblioteca
          </CommandItem>
          <CommandItem onSelect={() => go("/wiki/novo")} value="action-new-article">
            <Plus className="w-4 h-4 mr-2" /> Novo artigo
          </CommandItem>
        </CommandGroup>
        {categories.length > 0 && (
          <CommandGroup heading="Categorias">
            {categories.slice(0, 8).map((c) => (
              <CommandItem
                key={c.id || c.name}
                onSelect={() => go(`/wiki?category=${encodeURIComponent(c.name)}`)}
                value={`cat-${c.name}`}
              >
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
