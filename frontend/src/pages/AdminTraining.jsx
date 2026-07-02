import { useEffect, useState } from "react";
import api from "../lib/api";
import BlockEditor from "../components/BlockEditor";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyBlock = () => ({ id: uid(), type: "paragraph", content: "", meta: {} });

export default function AdminTraining() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseDialog, setCourseDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [contentDialog, setContentDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingContentModule, setEditingContentModule] = useState(null);

  // Course form
  const [courseForm, setCourseForm] = useState({ title: "", description: "", status: "draft", target_departments: [] });

  const AVAILABLE_DEPARTMENTS = ["TI", "Financeiro", "Diretoria", "Vendas", "Pós Vendas"];

  const toggleCourseDepartment = (dept) => {
    setCourseForm(prev => {
      const depts = prev.target_departments || [];
      const newDepts = depts.includes(dept) ? depts.filter(d => d !== dept) : [...depts, dept];
      return { ...prev, target_departments: newDepts };
    });
  };

  // Module form
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    type: "lesson",
    order: 0,
    passing_score: 70,
  });

  // Questions form
  const [questions, setQuestions] = useState([]);

  // Lesson content form
  const [contentBlocks, setContentBlocks] = useState([emptyBlock()]);

  const loadCourses = async () => {
    try {
      const res = await api.get("/training/courses");
      // For each course, fetch modules
      const coursesWithModules = await Promise.all(
        res.data.map(async (c) => {
          try {
            const detail = await api.get(`/training/courses/${c.id}`);
            return { ...detail.data };
          } catch {
            return { ...c, modules: [] };
          }
        })
      );
      setCourses(coursesWithModules);
    } catch {
      toast.error("Erro ao carregar cursos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // ---- Course CRUD ----
  const openNewCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", status: "draft", target_departments: [] });
    setCourseDialog(true);
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      status: course.status || "draft",
      target_departments: course.target_departments || [],
    });
    setCourseDialog(true);
  };

  const saveCourse = async () => {
    try {
      if (editingCourse) {
        await api.patch(`/training/courses/${editingCourse.id}`, courseForm);
        toast.success("Curso atualizado");
      } else {
        await api.post("/training/courses", courseForm);
        toast.success("Curso criado");
      }
      setCourseDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao salvar curso");
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Tem certeza que deseja excluir este curso e todos os seus módulos? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await api.delete(`/training/courses/${courseId}`);
      toast.success("Curso excluído com sucesso");
      setCourseDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao excluir curso");
    }
  };

  // ---- Module CRUD ----
  const openNewModule = (courseId, modules) => {
    setEditingModule(null);
    setModuleForm({
      title: "",
      description: "",
      type: "lesson",
      order: (modules?.length || 0) + 1,
      passing_score: 70,
    });
    setModuleDialog(courseId);
  };

  const openEditModule = (mod, courseId) => {
    setEditingModule(mod);
    setModuleForm({
      title: mod.title,
      description: mod.description || "",
      type: mod.type,
      order: mod.order,
      passing_score: mod.passing_score || 70,
    });
    setModuleDialog(courseId);
  };

  const saveModule = async () => {
    try {
      if (editingModule) {
        await api.patch(`/training/modules/${editingModule.id}`, moduleForm);
        toast.success("Módulo atualizado");
      } else {
        await api.post("/training/modules", {
          ...moduleForm,
          course_id: moduleDialog,
        });
        toast.success("Módulo criado");
      }
      setModuleDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao salvar módulo");
    }
  };

  const deleteModule = async (moduleId) => {
    if (!window.confirm("Tem certeza que deseja excluir este módulo? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await api.delete(`/training/modules/${moduleId}`);
      toast.success("Módulo excluído com sucesso");
      setModuleDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao excluir módulo");
    }
  };

  // ---- Questions ----
  const openQuestionEditor = (mod) => {
    setEditingQuizId(mod.id);
    setQuestions(
      (mod.questions || []).map((q, i) => ({
        ...q,
        id: q.id || `q_${i}`,
      }))
    );
    setQuestionDialog(true);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        text: "",
        options: ["", "", "", ""],
        correct_index: 0,
      },
    ]);
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[oIdx] = value;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveQuestions = async () => {
    try {
      await api.post(`/training/modules/${editingQuizId}/questions`, questions);
      toast.success("Perguntas salvas");
      setQuestionDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao salvar perguntas");
    }
  };

  // ---- Lesson content ----
  const openContentEditor = (mod) => {
    setEditingContentModule(mod);
    setContentBlocks(
      mod.content?.length
        ? mod.content.map((b, i) => ({ ...b, id: b.id || `b_${i}` }))
        : [emptyBlock()]
    );
    setContentDialog(true);
  };

  const saveContent = async () => {
    try {
      await api.patch(`/training/modules/${editingContentModule.id}`, {
        content: contentBlocks,
      });
      toast.success("Conteúdo salvo");
      setContentDialog(false);
      loadCourses();
    } catch (e) {
      toast.error("Erro ao salvar conteúdo");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Gestão de Treinamentos
          </div>
          <h2 className="font-display font-bold text-xl tracking-tight text-foreground mt-1">
            Cursos ({courses.length})
          </h2>
        </div>
        <Button onClick={openNewCourse} className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo Curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="surface p-10 text-center text-muted-foreground">
          Nenhum curso criado ainda. Clique em "Novo Curso" para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const isExpanded = expandedCourse === course.id;
            const modules = course.modules || [];

            return (
              <div key={course.id} className="surface overflow-hidden">
                {/* Course header */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-muted/50 transition"
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{course.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {modules.length} módulo(s) ·{" "}
                      <span
                        className={
                          course.status === "published"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }
                      >
                        {course.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCourse(course);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded modules */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                        Módulos
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openNewModule(course.id, modules)}
                        className="gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Módulo
                      </Button>
                    </div>

                    {modules.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-6">
                        Nenhum módulo ainda.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {modules.map((mod) => (
                          <div
                            key={mod.id}
                            className="flex items-center gap-3 bg-background border border-border rounded-md px-4 py-3"
                          >
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                              {mod.type === "quiz" ? (
                                <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {mod.order}. {mod.title}
                              </div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {mod.type === "quiz" 
                                  ? `Prova · ${(mod.questions || []).length} pergunta(s) · Nota mínima: ${mod.passing_score || 70}%`
                                  : `Aula · ${(mod.content || []).length} bloco(s)`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {mod.type === "quiz" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openQuestionEditor(mod)}
                                  className="gap-1 text-xs"
                                >
                                  <ClipboardCheck className="w-3 h-3" /> Perguntas
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openContentEditor(mod)}
                                  className="gap-1 text-xs"
                                >
                                  <BookOpen className="w-3 h-3" /> Conteúdo
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => openEditModule(mod, course.id)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Course Dialog */}
      <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Editar Curso" : "Novo Curso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Título</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="Ex: Treinamento Renault 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-desc">Descrição</Label>
              <textarea
                id="course-desc"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Descreva o objetivo do curso..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  variant={courseForm.status === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCourseForm({ ...courseForm, status: "draft" })}
                >
                  Rascunho
                </Button>
                <Button
                  variant={courseForm.status === "published" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCourseForm({ ...courseForm, status: "published" })}
                >
                  Publicado
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Setores Permitidos</Label>
              <div className="text-[10px] text-muted-foreground mb-1">Sem seleção: visível para todos</div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_DEPARTMENTS.map((dept) => {
                  const isSelected = (courseForm.target_departments || []).includes(dept);
                  return (
                    <button
                      key={dept}
                      onClick={() => toggleCourseDepartment(dept)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editingCourse && user?.role === "admin" ? (
              <Button variant="destructive" onClick={() => deleteCourse(editingCourse.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCourseDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveCourse} disabled={!courseForm.title.trim()}>
                {editingCourse ? "Salvar" : "Criar Curso"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog open={!!moduleDialog} onOpenChange={() => setModuleDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mod-title">Título</Label>
              <Input
                id="mod-title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Ex: Introdução ao sistema"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-desc">Descrição</Label>
              <Input
                id="mod-desc"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Breve descrição do módulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  variant={moduleForm.type === "lesson" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModuleForm({ ...moduleForm, type: "lesson" })}
                  className="gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Aula
                </Button>
                <Button
                  variant={moduleForm.type === "quiz" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModuleForm({ ...moduleForm, type: "quiz" })}
                  className="gap-1"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Prova
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mod-order">Ordem</Label>
                <Input
                  id="mod-order"
                  type="number"
                  value={moduleForm.order}
                  onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              {moduleForm.type === "quiz" && (
                <div className="space-y-2">
                  <Label htmlFor="mod-score">Nota Mínima (%)</Label>
                  <Input
                    id="mod-score"
                    type="number"
                    min={0}
                    max={100}
                    value={moduleForm.passing_score}
                    onChange={(e) => setModuleForm({ ...moduleForm, passing_score: parseInt(e.target.value) || 70 })}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editingModule && user?.role === "admin" ? (
              <Button variant="destructive" onClick={() => deleteModule(editingModule.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModuleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveModule} disabled={!moduleForm.title.trim()}>
                {editingModule ? "Salvar" : "Criar Módulo"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions Dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perguntas</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Pergunta {qIdx + 1}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => removeQuestion(qIdx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input
                  value={q.text}
                  onChange={(e) => updateQuestion(qIdx, "text", e.target.value)}
                  placeholder="Digite o enunciado da pergunta..."
                />
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(qIdx, "correct_index", oIdx)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                          q.correct_index === oIdx
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {q.correct_index === oIdx && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Opção ${oIdx + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addQuestion} className="w-full gap-1.5">
              <Plus className="w-4 h-4" /> Adicionar Pergunta
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveQuestions} className="gap-1">
              <Save className="w-4 h-4" /> Salvar Perguntas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Content Dialog */}
      <Dialog open={contentDialog} onOpenChange={setContentDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Conteúdo da aula{editingContentModule ? `: ${editingContentModule.title}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 border-t border-border">
            <BlockEditor blocks={contentBlocks} onChange={setContentBlocks} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveContent} className="gap-1">
              <Save className="w-4 h-4" /> Salvar Conteúdo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
