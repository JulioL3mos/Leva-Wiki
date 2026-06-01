import { useState } from "react";
import api from "../lib/api";
import { Button } from "./ui/button";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

export default function QuizPlayer({ module, onComplete, previousScore }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = module.questions || [];

  if (questions.length === 0) {
    return (
      <div className="surface p-12 text-center">
        <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-display font-bold text-lg text-foreground mb-2">
          Prova em preparação
        </h3>
        <p className="text-sm text-muted-foreground">
          O administrador ainda não adicionou perguntas a esta prova.
        </p>
      </div>
    );
  }

  const handleSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/training/modules/${module.id}/submit`, {
        answers,
      });
      setResult(res.data);
      if (res.data.passed) {
        onComplete?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
  };

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const q = questions[currentQuestion];

  // Result screen
  if (result) {
    return (
      <div className="surface p-8 lg:p-12">
        <div className="text-center max-w-md mx-auto">
          {result.passed ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="font-display font-black text-3xl tracking-tighter text-foreground mb-2">
                Parabéns!
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Você foi aprovado na prova com nota <span className="font-bold text-emerald-600 dark:text-emerald-400">{result.score}%</span>.
                O próximo módulo já está desbloqueado.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="font-display font-black text-3xl tracking-tighter text-foreground mb-2">
                Não foi dessa vez
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Sua nota foi <span className="font-bold text-red-600 dark:text-red-400">{result.score}%</span>.
                A nota mínima é <span className="font-semibold">{result.passing_score}%</span>.
                Revise o conteúdo e tente novamente.
              </p>
            </>
          )}

          <div className="surface p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Acertos</div>
                <div className="font-display font-black text-xl text-foreground">
                  {result.correct_count}/{result.total}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nota</div>
                <div className={`font-display font-black text-xl ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
                  {result.score}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mínimo</div>
                <div className="font-display font-black text-xl text-foreground">
                  {result.passing_score}%
                </div>
              </div>
            </div>
          </div>

          {!result.passed && (
            <Button onClick={handleRetry} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="surface p-6 lg:p-8">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">
        <ClipboardCheck className="w-3.5 h-3.5" /> Prova
      </div>
      <h2 className="font-display font-bold text-2xl tracking-tight text-foreground mb-1">
        {module.title}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Nota mínima para aprovação: {module.passing_score || 70}%
        {previousScore != null && (
          <span> · Sua nota anterior: <span className="font-semibold">{previousScore}%</span></span>
        )}
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-8">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === currentQuestion
                ? "bg-primary"
                : answers[questions[i].id] !== undefined
                ? "bg-primary/40"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          Pergunta {currentQuestion + 1} de {questions.length}
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mb-6">
          {q.text}
        </h3>

        <div className="space-y-3">
          {q.options.map((option, i) => {
            const selected = answers[q.id] === i;
            return (
              <button
                key={i}
                onClick={() => handleSelect(q.id, i)}
                className={`w-full text-left px-4 py-3.5 rounded-lg border-2 transition-all text-sm ${
                  selected
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border hover:border-primary/30 hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => setCurrentQuestion((c) => Math.max(0, c - 1))}
          disabled={currentQuestion === 0}
        >
          Anterior
        </Button>

        {currentQuestion < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestion((c) => c + 1)}
            disabled={answers[q.id] === undefined}
            className="gap-1"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
          >
            {submitting ? "Enviando…" : "Finalizar prova"}
          </Button>
        )}
      </div>
    </div>
  );
}
