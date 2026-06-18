import axios from "axios";

// URL relativa + proxy do dev server: funciona com ngrok sem expor localhost:8000 ao visitante.
// Só usa REACT_APP_BACKEND_URL quando aponta para um host externo (ex.: segundo túnel ngrok).
const configured = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/$/, "");
const useDirectBackend =
  configured && !/^https?:\/\/localhost(:\d+)?$/i.test(configured);
const BACKEND_URL = useDirectBackend ? configured : "";
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";
export const BACKEND_ORIGIN = BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Algo deu errado. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
