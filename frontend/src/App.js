import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./AppShell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WikiListPage from "./pages/WikiListPage";
import ArticleViewPage from "./pages/ArticleViewPage";
import ArticleEditorPage from "./pages/ArticleEditorPage";
import AdminPage from "./pages/AdminPage";
import FilesPage from "./pages/FilesPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/wiki" element={<WikiListPage />} />
              <Route path="/wiki/novo" element={<ProtectedRoute roles={["admin", "editor"]}><ArticleEditorPage /></ProtectedRoute>} />
              <Route path="/wiki/:id" element={<ArticleViewPage />} />
              <Route path="/wiki/:id/editar" element={<ProtectedRoute roles={["admin", "editor"]}><ArticleEditorPage /></ProtectedRoute>} />
              <Route path="/biblioteca" element={<FilesPage />} />
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminPage /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
