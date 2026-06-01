import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  ClipboardCheck,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/button";
import QuizPlayer from "../components/QuizPlayer";

export default function CourseView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    Promise.all([
      api.get(`/training/courses/${id}`),
      api.get("/training/progress"),
    ])
      .then(([courseRes, progressRes]) => {
        setCourse(courseRes.data);
        const p = progressRes.data.find((pr) => pr.course_id === id);
        setProgress(p || { completed_modules: [], scores: {} });
      })
      .catch(() => navigate("/academia"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !course) {
    return (
      <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 h-96 bg-muted rounded-lg" />
            <div className="lg:col-span-3 h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const modules = course.modules || [];
  const completedModules = progress?.completed_modules || [];

  const isModuleUnlocked = (index) => {
    if (index === 0) return true;
    const prevModule = modules[index - 1];
    return completedModules.includes(prevModule.id);
  };

  const isModuleCompleted = (moduleId) => completedModules.includes(moduleId);

  const activeModule = modules.find((m) => m.id === activeModuleId);

  const handleCompleteLesson = async (moduleId) => {
    try {
      await api.post(`/training/modules/${moduleId}/complete`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuizComplete = () => {
    fetchData();
    setActiveModuleId(null);
  };

  const totalModules = modules.length;
  const completedCount = completedModules.length;
  const pct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const isCourseDone = totalModules > 0 && completedCount >= totalModules;

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <Link
        to="/academia"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Academia
      </Link>

      {/* Course Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Curso
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tighter text-foreground mt-1">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">
              {course.description}
            </p>
          )}
        </div>

        {isCourseDone && (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg px-4 py-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-semibold">Curso concluído!</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="surface p-4 mb-8">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          <span>Progresso geral</span>
          <span>{completedCount} de {totalModules} módulos · {pct}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCourseDone ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module sidebar */}
        <div className="lg:col-span-1">
          <div className="surface p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
              Módulos
            </div>
            <div className="space-y-1">
              {modules.map((mod, i) => {
                const unlocked = isModuleUnlocked(i);
                const completed = isModuleCompleted(mod.id);
                const isActive = activeModuleId === mod.id;
                const isQuiz = mod.type === "quiz";

                return (
                  <button
                    key={mod.id}
                    onClick={() => unlocked && setActiveModuleId(mod.id)}
                    disabled={!unlocked}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-left transition ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : completed
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-muted"
                        : unlocked
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    <div className="shrink-0">
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : unlocked ? (
                        isQuiz ? (
                          <ClipboardCheck className="w-4 h-4" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{mod.title}</div>
                      <div className={`text-[10px] uppercase tracking-wider ${
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {isQuiz ? "Prova" : "Aula"}
                        {completed && progress?.scores?.[mod.id] != null && ` · Nota: ${progress.scores[mod.id]}%`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Module content */}
        <div className="lg:col-span-3">
          {!activeModule ? (
            <div className="surface p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                {modules.length === 0
                  ? "Este curso ainda não tem módulos"
                  : "Selecione um módulo para começar"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {modules.length === 0
                  ? "O administrador ainda está preparando o conteúdo deste curso."
                  : "Clique em um módulo na barra lateral para visualizar o conteúdo ou realizar a prova."}
              </p>
            </div>
          ) : activeModule.type === "quiz" ? (
            <QuizPlayer
              module={activeModule}
              onComplete={handleQuizComplete}
              previousScore={progress?.scores?.[activeModule.id]}
            />
          ) : (
            <div className="surface p-6 lg:p-8">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">
                <FileText className="w-3.5 h-3.5" /> Aula
              </div>
              <h2 className="font-display font-bold text-2xl tracking-tight text-foreground mb-6">
                {activeModule.title}
              </h2>

              {/* Render block content */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {(activeModule.content || []).map((block, idx) => (
                  <RenderBlock key={block.id || idx} block={block} />
                ))}
                {(!activeModule.content || activeModule.content.length === 0) && (
                  <p className="text-muted-foreground italic">Este módulo ainda não possui conteúdo.</p>
                )}
              </div>

              {/* Complete button */}
              {!isModuleCompleted(activeModule.id) && (
                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <Button
                    onClick={() => handleCompleteLesson(activeModule.id)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Marcar como concluída
                  </Button>
                </div>
              )}

              {isModuleCompleted(activeModule.id) && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Aula concluída
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RenderBlock({ block }) {
  switch (block.type) {
    case "h1":
      return <h1>{block.content}</h1>;
    case "h2":
      return <h2>{block.content}</h2>;
    case "h3":
      return <h3>{block.content}</h3>;
    case "paragraph":
      return <p>{block.content}</p>;
    case "bulleted":
      return (
        <ul>
          <li>{block.content}</li>
        </ul>
      );
    case "numbered":
      return (
        <ol>
          <li>{block.content}</li>
        </ol>
      );
    case "quote":
      return <blockquote>{block.content}</blockquote>;
    case "code":
      return (
        <pre>
          <code>{block.content}</code>
        </pre>
      );
    case "divider":
      return <hr />;
    case "image":
      return (
        <figure>
          <img src={block.meta?.url || block.content} alt={block.meta?.alt || ""} />
        </figure>
      );
    default:
      return <p>{block.content}</p>;
  }
}
