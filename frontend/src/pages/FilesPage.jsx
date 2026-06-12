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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Upload, FileText, FileImage, FileVideo, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const DEPARTMENTS = ["TI", "Financeiro", "Diretoria", "Vendas", "Pós Vendas"];

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
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState("Geral");
  const [targetDepartments, setTargetDepartments] = useState([]);
  
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

  const upload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("category", uploadCategory);
    fd.append("target_departments", targetDepartments.join(","));
    try {
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Arquivo enviado");
      setUploadDialog(false);
      setSelectedFile(null);
      setTargetDepartments([]);
      load();
    } catch (err) {
      toast.error("Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleDept = (d) => {
    setTargetDepartments(prev => 
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
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
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Recursos</div>
      <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-foreground mt-2">Biblioteca de Arquivos</h1>
      <p className="text-muted-foreground mt-2">PDFs, imagens, vídeos e documentos.</p>

      <div className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
            onClick={() => setUploadDialog(true)}
            disabled={uploading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 shrink-0"
            data-testid="files-upload-btn"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Enviar arquivo
          </Button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {files.length === 0 && (
          <div className="col-span-full surface p-10 text-center text-muted-foreground">Nenhum arquivo.</div>
        )}
        {files.map((f) => {
          const Icon = ICON(f.content_type);
          return (
            <div key={f.id} className="surface p-4 flex flex-col group hover:-translate-y-0.5 hover:shadow-sm transition-soft" data-testid={`file-card-${f.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{f.original_filename}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-2">
                    <span>{f.category} · {fmt(f.size)}</span>
                    {f.target_departments && f.target_departments.length > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-primary/10 text-primary">
                        {f.target_departments.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{f.uploaded_by_name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground font-medium"
                    data-testid={`file-open-${f.id}`}
                  >
                    Abrir
                  </a>
                  {canUpload && (
                    <button onClick={() => remove(f.id)} className="text-destructive hover:text-destructive/80" data-testid={`file-delete-${f.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={uploadDialog} onOpenChange={(open) => {
        if (!open && !uploading) {
          setUploadDialog(false);
          setSelectedFile(null);
          setTargetDepartments([]);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Arquivo</label>
              {!selectedFile ? (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo</span>
                  <input 
                    ref={fileRef} 
                    type="file" 
                    hidden 
                    onChange={(e) => setSelectedFile(e.target.files?.[0])} 
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats.filter(c => c !== "Todos").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Setores Permitidos (Opcional)</label>
              <p className="text-xs text-muted-foreground">Se nenhum for selecionado, o arquivo será público.</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {DEPARTMENTS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDept(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      targetDepartments.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={upload} disabled={!selectedFile || uploading} className="bg-primary text-primary-foreground">
              {uploading ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
