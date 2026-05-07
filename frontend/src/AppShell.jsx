import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import api from "./lib/api";
import { useAuth } from "./contexts/AuthContext";

const FALLBACK_CATEGORIES = [
  { name: "Onboarding", icon: "Sparkles", article_count: 0 },
  { name: "Processos", icon: "GitBranch", article_count: 0 },
  { name: "Treinamentos", icon: "GraduationCap", article_count: 0 },
  { name: "Manuais Técnicos", icon: "Wrench", article_count: 0 },
  { name: "FAQ", icon: "HelpCircle", article_count: 0 },
  { name: "Renault", icon: "Car", article_count: 0 },
  { name: "Geely", icon: "Car", article_count: 0 },
  { name: "Bajaj", icon: "Bike", article_count: 0 },
  { name: "Geral", icon: "FileText", article_count: 0 },
];

export default function AppShell() {
  const { user } = useAuth();
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    if (!user) return;
    api
      .get("/wiki/categories")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length) setCategories(r.data);
      })
      .catch(() => {});
  }, [user]);

  return <Layout categories={categories} />;
}
