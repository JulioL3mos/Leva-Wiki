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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function blockClass(type) {
  switch (type) {
    case "h1":
      return "text-4xl font-display font-black tracking-tighter text-foreground outline-none w-full";
    case "h2":
      return "text-2xl font-display font-bold tracking-tight text-foreground outline-none w-full";
    case "h3":
      return "text-xl font-display font-semibold tracking-tight text-foreground outline-none w-full";
    case "quote":
      return "text-lg italic text-muted-foreground border-l-4 border-primary pl-4 outline-none w-full";
    case "code":
      return "font-mono text-sm bg-muted border border-border rounded-md p-3 text-foreground outline-none w-full whitespace-pre-wrap";
    default:
      return "text-base text-foreground leading-relaxed outline-none w-full";
  }
}

function ImageBlock({ b, updateBlock }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/wiki/images/upload", formData);
      updateBlock(b.id, { content: data.url, meta: { ...b.meta, filename: file.name } });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Falha no upload da imagem");
    } finally {
      setUploading(false);
    }
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
    <div className="w-full my-2">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground hover:bg-muted transition text-muted-foreground"
      >
        {uploading ? (
          <span className="flex items-center gap-2"><Upload className="w-5 h-5 animate-bounce" /> Enviando…</span>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Clique para fazer upload de um print ou imagem</span>
          </>
        )}
      </button>
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
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) {
      onChange([{ id: uid(), type: "paragraph", content: "", meta: {} }]);
      return;
    }
    onChange(blocks.filter((b) => b.id !== id));
  };

  const handleKeyDown = (e, b, idx) => {
    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      insertBlock(b.id, "paragraph");
    } else if (e.key === "Backspace" && (b.content || "") === "") {
      e.preventDefault();
      const prev = blocks[idx - 1];
      removeBlock(b.id);
      if (prev) setTimeout(() => refs.current[prev.id]?.focus(), 10);
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

  return (
    <div className="block-editor space-y-1.5" data-testid="block-editor">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
              {blocks.map((b, idx) => {
                const meta = TYPES.find((t) => t.type === b.type) || TYPES[0];
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
                            {b.type === "numbered" && <span className="mt-2 text-muted-foreground font-mono text-sm">{idx + 1}.</span>}
                            {b.type === "code" ? (
                              <textarea
                                ref={(el) => (refs.current[b.id] = el)}
                                value={b.content}
                                onChange={(e) => updateBlock(b.id, { content: e.target.value })}
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
                                onChange={(e) => updateBlock(b.id, { content: e.target.value })}
                                onKeyDown={(e) => handleKeyDown(e, b, idx)}
                                placeholder={meta.placeholder}
                                className={blockClass(b.type)}
                                data-testid={`block-input-${b.id}`}
                              />
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
    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 pt-1.5">
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 hover:bg-slate-100 rounded text-slate-400" data-testid={`block-handle-${b.id}`} {...dragHandleProps}>
            <GripVertical className="w-4 h-4" />
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
  return blocks?.map((b, idx) => {
    if (b.type === "divider") return <hr key={b.id} className="my-6 border-slate-200" />;
    if (b.type === "h1") return <MarkdownContent key={b.id} id={`block-${b.id}`} tag="h1" className="text-4xl font-display font-black tracking-tighter mt-10 mb-4" content={b.content} />;
    if (b.type === "h2") return <MarkdownContent key={b.id} id={`block-${b.id}`} tag="h2" className="text-2xl font-display font-bold tracking-tight mt-8 mb-3" content={b.content} />;
    if (b.type === "h3") return <MarkdownContent key={b.id} id={`block-${b.id}`} tag="h3" className="text-xl font-display font-semibold tracking-tight mt-6 mb-2" content={b.content} />;
    if (b.type === "quote") return <blockquote key={b.id} className="border-l-4 border-slate-900 pl-4 italic text-slate-600 my-4 text-lg"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></blockquote>;
    if (b.type === "code") return <pre key={b.id} className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-md p-4 my-4 whitespace-pre-wrap text-slate-800">{b.content}</pre>;
    if (b.type === "image") {
      const imageUrl = b.content.startsWith("http") ? b.content : `${API_BASE.replace("/api", "")}${b.content}`;
      return <img key={b.id} src={imageUrl} alt={b.meta?.filename || ""} className="rounded-lg border border-slate-200 my-6 max-h-[600px] w-auto" />;
    }
    if (b.type === "bulleted") return <li key={b.id} className="ml-6 list-disc text-slate-700 leading-relaxed"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></li>;
    if (b.type === "numbered") return <li key={b.id} className="ml-6 list-decimal text-slate-700 leading-relaxed"><ReactMarkdown components={{p: 'span', a: ({node, ...p}) => <a className="underline" {...p}/>}}>{b.content}</ReactMarkdown></li>;
    return <MarkdownContent key={b.id} tag="p" className="text-slate-700 leading-relaxed my-3" content={b.content} />;
  });
}
