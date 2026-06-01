import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  GraduationCap,
  BookOpen,
  Trophy,
  Clock,
  ChevronRight,
  Lock,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

export default function TrainingDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/training/courses"),
      api.get("/training/progress"),
    ])
      .then(([coursesRes, progressRes]) => {
        setCourses(coursesRes.data);
        setProgress(progressRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getProgress = (courseId) => progress.find((p) => p.course_id === courseId);

  const getCourseProgress = (course, modules) => {
    const p = getProgress(course.id);
    if (!p || !modules) return 0;
    if (modules.length === 0) return 0;
    return Math.round((p.completed_modules.length / modules.length) * 100);
  };

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const inProgress = courses.filter((c) => {
    const p = getProgress(c.id);
    return p && p.completed_modules.length > 0;
  });

  const available = courses.filter((c) => {
    const p = getProgress(c.id);
    return !p || p.completed_modules.length === 0;
  });

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2">
          <GraduationCap className="w-3 h-3" /> Academia
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter text-foreground mt-2">
          Treinamentos
        </h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Desenvolva suas competências com os cursos oficiais do Grupo LEVA.
          Complete as etapas e conquiste sua certificação.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
        <StatCard icon={BookOpen} label="Cursos disponíveis" value={courses.length} />
        <StatCard icon={Clock} label="Em andamento" value={inProgress.length} />
        <StatCard
          icon={Trophy}
          label="Concluídos"
          value={
            courses.filter((c) => {
              const p = getProgress(c.id);
              return p && c._moduleCount && p.completed_modules.length >= c._moduleCount;
            }).length
          }
        />
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4 flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" /> Continuar estudando
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgress.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={getProgress(course.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Courses */}
      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> {inProgress.length > 0 ? "Outros cursos" : "Cursos disponíveis"}
        </div>
        {available.length === 0 && courses.length === 0 ? (
          <div className="surface p-12 text-center">
            <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">
              Nenhum curso disponível no momento.
              {user?.role === "admin" && (
                <> <Link to="/admin" className="underline text-foreground/80">Crie o primeiro curso</Link>.</>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {available.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={getProgress(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course, progress }) {
  const completedCount = progress?.completed_modules?.length || 0;
  const pct = course._moduleCount
    ? Math.round((completedCount / course._moduleCount) * 100)
    : 0;

  return (
    <Link
      to={`/academia/${course.id}`}
      className="surface group hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
      data-testid={`course-card-${course.id}`}
    >
      {/* Thumbnail area */}
      <div className="h-36 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative overflow-hidden">
        <GraduationCap className="w-12 h-12 text-primary/20" strokeWidth={1.25} />
        {pct === 100 && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Concluído
          </div>
        )}
        {pct > 0 && pct < 100 && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
            {pct}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 flex-1">
          {course.description || "Sem descrição."}
        </p>

        {/* Progress bar */}
        {completedCount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {completedCount > 0 ? `${completedCount} módulo(s) concluído(s)` : "Começar agora"}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          {label}
        </div>
        <Icon className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.75} />
      </div>
      <div className="font-display font-black text-3xl tracking-tighter text-foreground mt-2">
        {value}
      </div>
    </div>
  );
}
