import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        setTheme(isDark ? "light" : "dark");
      }}
      className="relative flex cursor-pointer select-none items-center justify-between w-full rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted group"
      aria-label="Alternar tema"
    >
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="w-4 h-4 mr-2 text-blue-400 fill-blue-400/20" />
        ) : (
          <Sun className="w-4 h-4 mr-2 text-amber-500 fill-amber-500/20" />
        )}
        <span>Modo {isDark ? "Escuro" : "Claro"}</span>
      </div>
      
      <div className="relative w-8 h-4 bg-muted border border-border rounded-full transition-colors duration-300">
        <div 
          className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
            isDark ? "translate-x-4 bg-blue-400" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}
