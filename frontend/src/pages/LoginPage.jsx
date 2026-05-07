import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowRight, Lock } from "lucide-react";

const BG_IMG =
  "https://static.prod-images.emergentagent.com/jobs/959f7354-92fb-4001-9efa-447a14795da2/images/03500dc57bf3eb1339ac600c02b3a2a865758769dc1749db53105d2bd03e8f51.png";

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const [email, setEmail] = useState("admin@levaportal.com");
  const [password, setPassword] = useState("admin123");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("login");

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left visual */}
      <div className="hidden lg:flex relative overflow-hidden bg-slate-900">
        <img
          src={BG_IMG}
          alt="LEVA"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/30 to-slate-900/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white text-slate-900 flex items-center justify-center font-display font-black tracking-tighter text-xl">
              L
            </div>
            <div>
              <div className="font-display font-bold tracking-tight text-lg">Portal LEVA</div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60 mt-0.5">
                Conhecimento Corporativo
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">Grupo Multibandeira</div>
            <h1 className="text-5xl xl:text-6xl font-display font-black tracking-tighter leading-[1.05]">
              Conhecimento que move<br />o grupo inteiro.
            </h1>
            <p className="text-white/70 max-w-md text-base leading-relaxed">
              Centralize processos, treinamentos e manuais em um só lugar.
              Padronize a operação das bandeiras Renault, Geely e Bajaj.
            </p>
            <div className="flex items-center gap-6 pt-6">
              <BadgeBrand label="RENAULT" />
              <BadgeBrand label="GEELY" />
              <BadgeBrand label="BAJAJ" />
            </div>
          </div>
          <div className="text-xs text-white/50 font-mono">© LEVA · acesso interno</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-display font-black tracking-tighter">
              L
            </div>
            <div className="font-display font-bold">Portal LEVA</div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-2">
            <Lock className="inline w-3 h-3 mr-1.5 -mt-0.5" /> Acesso interno
          </div>
          <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900 mb-1">Bem-vindo de volta</h2>
          <p className="text-slate-500 text-sm mb-8">Entre para acessar a base de conhecimento.</p>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
              <TabsContent value="register" className="m-0">
                <div className="space-y-2 mb-4">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    required={tab === "register"}
                    data-testid="input-name"
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="input-password"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="auth-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 font-semibold"
                disabled={submitting}
                data-testid="submit-auth"
              >
                {submitting ? "Aguarde…" : tab === "login" ? "Entrar" : "Criar conta"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              {tab === "login" && (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3 mt-4">
                  <div className="font-semibold text-slate-700 mb-1">Conta de demonstração</div>
                  <div className="font-mono">admin@levaportal.com / admin123</div>
                </div>
              )}
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function BadgeBrand({ label }) {
  return (
    <div className="text-[10px] tracking-[0.3em] font-semibold text-white/80 border border-white/20 rounded-full px-3 py-1.5">
      {label}
    </div>
  );
}
