import { useRef, useEffect, useState } from "react";
import api, { API_BASE } from "../lib/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ReactMarkdown from "react-markdown";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Type,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Upload,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const TYPES = [
  { type: "paragraph", label: "Texto", icon: Type, placeholder: "Comece a escrever ou digite '/' para comandos…" },
  { type: "h1", label: "Título 1", icon: Heading1, placeholder: "Título 1" },
  { type: "h2", label: "Título 2", icon: Heading2, placeholder: "Título 2" },
  { type: "h3", label: "Título 3", icon: Heading3, placeholder: "Título 3" },
  { type: "bulleted", label: "Lista", icon: List, placeholder: "Item da lista" },
  { type: "numbered", label: "Lista numerada", icon: ListOrdered, placeholder: "Item numerado" },
  { type: "quote", label: "Citação", icon: Quote, placeholder: "Citação…" },
  { type: "code", label: "Código", icon: Code, placeholder: "Trecho de código" },
  { type: "image", label: "Imagem", icon: ImageIcon, placeholder: "" },
  { type: "divider", label: "Divisor", icon: Minus, placeholder: "" },
];

const normalizeText = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function blockClass(type) {
  switch (type) {
    case "h1":
      return "text-4xl font-display font-black tracking-tighter text-foreground outline-none w-full !bg-transparent";
    case "h2":
      return "text-2xl font-display font-bold tracking-tight text-foreground outline-none w-full !bg-transparent";
    case "h3":
      return "text-xl font-display font-semibold tracking-tight text-foreground outline-none w-full !bg-transparent";
    case "quote":
      return "text-lg italic text-muted-foreground border-l-4 border-primary pl-4 outline-none w-full !bg-transparent";
    case "code":
      return "font-mono text-sm bg-muted border border-border rounded-md p-3 text-foreground outline-none w-full whitespace-pre-wrap";
    default:
      return "text-base text-foreground leading-relaxed outline-none w-full !bg-transparent";
  }
}

function ImageBlock({ b, updateBlock }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Apenas imagens são permitidas");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/wiki/images/upload", formData);
      updateBlock(b.id, { content: data.url, meta: { ...b.meta, filename: file.name || "pasted-image.png" } });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Falha no upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  if (b.content) {
    const imageUrl = b.content.startsWith("http") ? b.content : `${API_BASE.replace("/api", "")}${b.content}`;
    return (
      <div className="relative group/img w-full my-4">
        <img src={imageUrl} alt="" className="rounded-lg border border-border max-h-[500px] w-auto" />
        <button 
          onClick={() => updateBlock(b.id, { content: "" })}
          className="absolute top-2 left-2 p-1.5 bg-background/90 shadow-sm rounded-md opacity-0 group-hover/img:opacity-100 transition text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full my-2"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        ref={dropZoneRef}
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition cursor-pointer outline-none
          ${dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-muted-foreground hover:bg-muted"
          } text-muted-foreground`}
      >
        {uploading ? (
          <span className="flex items-center gap-2"><Upload className="w-5 h-5 animate-bounce" /> Enviando…</span>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Clique para fazer upload de uma imagem</span>
            <span className="text-xs text-muted-foreground/70 mt-1">ou cole (Ctrl+V) / arraste uma imagem aqui</span>
          </>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

export default function BlockEditor({ blocks, onChange }) {
  const refs = useRef({});
  const blocksRef = useRef(blocks);
  const [slashMenu, setSlashMenu] = useState(null);

  // Manter ref sempre sincronizado com o último valor de blocks
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (slashMenu) {
      const activeEl = document.getElementById(`slash-menu-item-${slashMenu.selectedIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [slashMenu?.selectedIndex]);

  const updateBlock = (id, patch) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const insertBlock = (afterId, type = "paragraph") => {
    const newBlock = { id: uid(), type, content: "", meta: {} };
    const idx = blocks.findIndex((b) => b.id === afterId);
    const next = [...blocks];
    next.splice(idx + 1, 0, newBlock);
    onChange(next);
    setTimeout(() => {
      refs.current[newBlock.id]?.focus();
    }, 10);
    return newBlock;
  };

  // Upload de imagem colada em qualquer bloco de texto
  const handleGlobalPaste = async (e, b) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        // Cria um bloco de imagem logo abaixo do bloco atual
        const newBlock = { id: uid(), type: "image", content: "", meta: {} };
        const idx = blocks.findIndex((x) => x.id === b.id);
        const next = [...blocks];
        next.splice(idx + 1, 0, newBlock);
        onChange(next);

        // Faz o upload da imagem colada
        const formData = new FormData();
        formData.append("file", file);
        try {
          const { data } = await api.post("/wiki/images/upload", formData);
          // Usa blocksRef para pegar o array mais recente após o React re-render
          const latestBlocks = blocksRef.current;
          onChange(latestBlocks.map((block) =>
            block.id === newBlock.id
              ? { ...block, content: data.url, meta: { filename: "pasted-image.png" } }
              : block
          ));
        } catch (error) {
          console.error("Paste upload failed:", error);
          alert("Falha no upload da imagem colada");
        }
        return;
      }
    }
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) {
      onChange([{ id: uid(), type: "paragraph", content: "", meta: {} }]);
      return;
    }
    onChange(blocks.filter((b) => b.id !== id));
  };

  const handleKeyDown = (e, b, idx) => {
    if (slashMenu?.blockId === b.id) {
      const query = normalizeText(slashMenu.query || "");
      const filteredTypes = TYPES.filter(t => normalizeText(t.label).includes(query));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredTypes.length > 0) {
          setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredTypes.length }));
        }
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredTypes.length > 0) {
          setSlashMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredTypes.length) % filteredTypes.length }));
        }
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredTypes.length > 0) {
          // Fallback para 0 se o índice estiver fora do escopo após filtragem
          const idxToSelect = slashMenu.selectedIndex < filteredTypes.length ? slashMenu.selectedIndex : 0;
          updateBlock(b.id, { type: filteredTypes[idxToSelect].type, content: "" });
        }
        setSlashMenu(null);
        setTimeout(() => refs.current[b.id]?.focus(), 10);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      // Se houver menu aberto, apenas fecha
      if (slashMenu?.blockId === b.id) setSlashMenu(null);
      
      // Comportamento de Lista: Se for lista e tiver conteúdo, cria outra lista igual.
      // Se for lista vazia e apertar Enter, transforma em parágrafo normal para "sair" da lista.
      if ((b.type === "bulleted" || b.type === "numbered")) {
        if ((b.content || "") === "") {
          updateBlock(b.id, { type: "paragraph" });
        } else {
          insertBlock(b.id, b.type);
        }
      } else {
        insertBlock(b.id, "paragraph");
      }
    } else if (e.key === "Backspace" && (b.content || "") === "") {
      e.preventDefault();
      // Se for apagar um bloco que não seja parágrafo, transforma em parágrafo primeiro
      if (b.type !== "paragraph") {
        updateBlock(b.id, { type: "paragraph" });
      } else {
        const prev = blocks[idx - 1];
        removeBlock(b.id);
        if (prev) setTimeout(() => refs.current[prev.id]?.focus(), 10);
      }
    } else if (e.key === "Escape" && slashMenu?.blockId === b.id) {
      setSlashMenu(null);
    }
  };

  const handleInput = (e, b) => {
    const val = e.target.value;
    updateBlock(b.id, { content: val });
    if (val === "/") {
      setSlashMenu({ blockId: b.id, query: "", selectedIndex: 0 });
    } else if (val.startsWith("/") && slashMenu?.blockId === b.id) {
      setSlashMenu(prev => ({ ...prev, query: val.slice(1).toLowerCase(), selectedIndex: 0 }));
    } else if (slashMenu?.blockId === b.id) {
      setSlashMenu(null);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    if (sourceIdx === destIdx) return;
    
    const newBlocks = Array.from(blocks);
    const [moved] = newBlocks.splice(sourceIdx, 1);
    newBlocks.splice(destIdx, 0, moved);
    onChange(newBlocks);
  };

  useEffect(() => {
    if (!blocks || blocks.length === 0) {
      onChange([{ id: uid(), type: "paragraph", content: "", meta: {} }]);
    }
  }, [blocks, onChange]);

  const getListNumber = (currentIndex) => {
    let num = 1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (blocks[i].type === "numbered") num++;
      else break;
    }
    return num;
  };

  return (
    <div className="block-editor space-y-1.5 pb-32" data-testid="block-editor">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
              {blocks.map((b, idx) => {
                const meta = TYPES.find((t) => t.type === b.type) || TYPES[0];
                const query = normalizeText(slashMenu?.query || "");
                const filteredTypes = TYPES.filter(t => normalizeText(t.label).includes(query));
                const validSelectedIndex = (slashMenu?.selectedIndex || 0) < filteredTypes.length ? (slashMenu?.selectedIndex || 0) : 0;
                
                return (
                  <Draggable key={b.id} draggableId={b.id} index={idx}>
                    {(provided) => {
                      const handleProps = provided.dragHandleProps;
                      
                      let contentNode;
                      if (b.type === "divider") {
                        contentNode = (
                          <div className="group flex items-center gap-2 py-2" data-testid={`block-${b.type}`}>
                            <BlockHandle b={b} insertBlock={insertBlock} removeBlock={removeBlock} updateBlock={updateBlock} dragHandleProps={handleProps} />
                            <hr className="flex-1 border-border" />
                          </div>
                        );
                      } else if (b.type === "image") {
                        contentNode = (
                          <div className="group flex items-start gap-2" data-testid={`block-${b.type}`}>
                            <BlockHandle b={b} insertBlock={insertBlock} removeBlock={removeBlock} updateBlock={updateBlock} dragHandleProps={handleProps} />
                            <ImageBlock b={b} updateBlock={updateBlock} />
                          </div>
                        );
                      } else {
                        contentNode = (
                          <div className="group flex items-start gap-2" data-testid={`block-${b.type}`}>
                            <BlockHandle b={b} insertBlock={insertBlock} removeBlock={removeBlock} updateBlock={updateBlock} dragHandleProps={handleProps} />
                            {b.type === "bulleted" && <span className="mt-2 text-muted-foreground">•</span>}
                            {b.type === "numbered" && <span className="mt-2 text-muted-foreground font-mono text-sm">{getListNumber(idx)}.</span>}
                            {b.type === "code" ? (
                              <textarea
                                ref={(el) => (refs.current[b.id] = el)}
                                value={b.content}
                                onChange={(e) => handleInput(e, b)}
                                onPaste={(e) => handleGlobalPaste(e, b)}
                                placeholder={meta.placeholder}
                                rows={Math.max(3, b.content.split("\n").length)}
                                className={blockClass(b.type)}
                                data-testid={`block-input-${b.id}`}
                              />
                            ) : (
                              <input
                                ref={(el) => (refs.current[b.id] = el)}
                                type="text"
                                value={b.content}
                                onChange={(e) => handleInput(e, b)}
                                onKeyDown={(e) => handleKeyDown(e, b, idx)}
                                onPaste={(e) => handleGlobalPaste(e, b)}
                                placeholder={meta.placeholder}
                                className={blockClass(b.type)}
                                data-testid={`block-input-${b.id}`}
                              />
                            )}
                            {slashMenu?.blockId === b.id && (
                              <div className="absolute left-8 top-full mt-1 w-64 bg-background border border-border shadow-lg rounded-md overflow-hidden z-50">
                                <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/50">Transformar em...</div>
                                <div className="max-h-64 overflow-y-auto p-1">
                                  {filteredTypes.map((t, i) => {
                                    const isSelected = i === validSelectedIndex;
                                    return (
                                      <button
                                        key={t.type}
                                        id={`slash-menu-item-${i}`}
                                        onClick={() => {
                                          updateBlock(b.id, { type: t.type, content: "" });
                                          setSlashMenu(null);
                                          setTimeout(() => refs.current[b.id]?.focus(), 10);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-sm flex items-center rounded-sm hover:bg-muted focus:bg-muted outline-none transition-colors ${isSelected ? "bg-muted" : ""}`}
                                      >
                                        <t.icon className="w-4 h-4 mr-2 text-muted-foreground" /> {t.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="relative">
                          {contentNode}
                        </div>
                      );
                    }}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function BlockHandle({ b, insertBlock, removeBlock, updateBlock, dragHandleProps }) {
  return (
    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 pt-1.5 gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 hover:bg-slate-100 rounded text-slate-400" data-testid={`block-add-${b.id}`}>
            <Plus className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {TYPES.map((t) => (
            <DropdownMenuItem key={t.type} onClick={() => insertBlock(b.id, t.type)}>
              <t.icon className="w-4 h-4 mr-2 text-slate-500" /> {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="p-0.5 hover:bg-slate-100 rounded text-slate-400 cursor-grab active:cursor-grabbing flex items-center" data-testid={`block-handle-${b.id}`} {...dragHandleProps}>
        <GripVertical className="w-4 h-4" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 hover:bg-slate-100 rounded text-slate-400" data-testid={`block-options-${b.id}`}>
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-slate-400">Transformar</div>
          {TYPES.map((t) => (
            <DropdownMenuItem key={t.type} onClick={() => updateBlock(b.id, { type: t.type })}>
              <t.icon className="w-4 h-4 mr-2 text-slate-500" /> {t.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => removeBlock(b.id)} className="text-red-600 focus:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const MarkdownContent = ({ content, tag: Tag, className, id }) => {
  return (
    <ReactMarkdown
      components={{
        p: ({ node, ...props }) => <Tag id={id} className={className} {...props} />,
        a: ({ node, ...props }) => <a className="text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export function renderBlocks(blocks) {
  const result = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      const Tag = currentList.type;
      result.push(
        <Tag key={`list-${result.length}`} className={Tag === 'ol' ? "list-decimal ml-6 my-4 space-y-1" : "list-disc ml-6 my-4 space-y-1"}>
          {currentList.items}
        </Tag>
      );
      currentList = null;
    }
  };

  blocks?.forEach((b) => {
    if (b.type !== "numbered" && b.type !== "bulleted") {
      flushList();
    }

    if (b.type === "divider") result.push(<hr key={b.id} className="my-6 border-border" />);
    else if (b.type === "h1") result.push(<MarkdownContent key={b.id} id={`block-${b.id}`} tag="h1" className="text-4xl font-display font-black tracking-tighter mt-10 mb-4 text-foreground" content={b.content} />);
    else if (b.type === "h2") result.push(<MarkdownContent key={b.id} id={`block-${b.id}`} tag="h2" className="text-2xl font-display font-bold tracking-tight mt-8 mb-3 text-foreground" content={b.content} />);
    else if (b.type === "h3") result.push(<MarkdownContent key={b.id} id={`block-${b.id}`} tag="h3" className="text-xl font-display font-semibold tracking-tight mt-6 mb-2 text-foreground" content={b.content} />);
    else if (b.type === "quote") result.push(<blockquote key={b.id} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 text-lg"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></blockquote>);
    else if (b.type === "code") result.push(<pre key={b.id} className="font-mono text-sm bg-muted border border-border rounded-md p-4 my-4 whitespace-pre-wrap text-foreground">{b.content}</pre>);
    else if (b.type === "image") {
      const imageUrl = b.content.startsWith("http") ? b.content : `${API_BASE.replace("/api", "")}${b.content}`;
      result.push(<img key={b.id} src={imageUrl} alt={b.meta?.filename || ""} className="rounded-lg border border-border my-6 max-h-[600px] w-auto" />);
    }
    else if (b.type === "bulleted") {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(<li key={b.id} className="text-foreground leading-relaxed marker:text-muted-foreground"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></li>);
    }
    else if (b.type === "numbered") {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(<li key={b.id} className="text-foreground leading-relaxed marker:text-muted-foreground"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></li>);
    }
    else {
      result.push(<MarkdownContent key={b.id} tag="p" className="text-foreground leading-relaxed my-3" content={b.content} />);
    }
  });

  flushList();
  return result;
}
