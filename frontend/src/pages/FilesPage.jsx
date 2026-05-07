import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Upload, FileText, FileImage, FileVideo, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const ICON = (ct = "") => {
  if (ct.startsWith("image/")) return FileImage;
  if (ct.startsWith("video/")) return FileVideo;
  return FileText;
};

const fmt = (b) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Todos");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category && category !== "Todos") params.set("category", category);
    const { data } = await api.get(`/files?${params.toString()}`);
    setFiles(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [q, category]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category === "Todos" ? "Geral" : category);
    try {
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Arquivo enviado");
      load();
    } catch (err) {
      toast.error("Falha no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir arquivo?")) return;
    await api.delete(`/files/${id}`);
    toast.success("Arquivo excluído");
    load();
  };

  const canUpload = user?.role === "admin" || user?.role === "editor";
  const cats = ["Todos", "Geral", "Onboarding", "Processos", "Treinamentos", "Manuais Técnicos", "FAQ", "Renault", "Geely", "Bajaj"];

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Recursos</div>
      <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-slate-900 mt-2">Biblioteca de Arquivos</h1>
      <p className="text-slate-500 mt-2">PDFs, imagens, vídeos e documentos.</p>

      <div className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar arquivo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
            data-testid="files-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-56 h-11" data-testid="files-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cats.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canUpload && (
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-slate-900 hover:bg-slate-800 text-white h-11 shrink-0"
            data-testid="files-upload-btn"
          >
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Enviando…" : "Enviar arquivo"}
          </Button>
        )}
        <input ref={fileRef} type="file" hidden onChange={upload} data-testid="files-upload-input" />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {files.length === 0 && (
          <div className="col-span-full surface p-10 text-center text-slate-400">Nenhum arquivo.</div>
        )}
        {files.map((f) => {
          const Icon = ICON(f.content_type);
          return (
            <div key={f.id} className="surface p-4 flex flex-col group hover:-translate-y-0.5 hover:shadow-sm transition-soft" data-testid={`file-card-${f.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{f.original_filename}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.category} · {fmt(f.size)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{f.uploaded_by_name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-700 hover:text-slate-900 font-medium"
                    data-testid={`file-open-${f.id}`}
                  >
                    Abrir
                  </a>
                  {canUpload && (
                    <button onClick={() => remove(f.id)} className="text-red-500 hover:text-red-700" data-testid={`file-delete-${f.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
