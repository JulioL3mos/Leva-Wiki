import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import api from "./lib/api";

export default function AppShell() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    api.get("/wiki/categories").then((r) => setCategories(r.data)).catch(() => setCategories([]));
  }, []);
  return <Layout categories={categories} />;
}
