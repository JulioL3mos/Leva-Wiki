import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---
// Mock do AuthContext para controlar o estado de autenticação
const mockLogin = jest.fn();
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock da API para simular login com sucesso/falha
jest.mock("../../lib/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
  formatApiErrorDetail: (d) => d,
}));

import { useAuth } from "../../contexts/AuthContext";
import LoginPage from "../LoginPage";

// Helper: renderiza o LoginPage dentro de um Router (necessário para Navigate/Link)
function renderLogin(authState = { user: null, login: mockLogin, loading: false }) {
  useAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

// ----------------------------------------------------------------
describe("LoginPage — renderização", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renderiza o formulário de login", () => {
    renderLogin();
    expect(screen.getByTestId("auth-form")).toBeInTheDocument();
  });

  test("exibe o campo de e-mail", () => {
    renderLogin();
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
  });

  test("exibe o campo de senha", () => {
    renderLogin();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
  });

  test("exibe o botão de submit", () => {
    renderLogin();
    expect(screen.getByTestId("submit-auth")).toBeInTheDocument();
  });

  test("não exibe mensagem de erro inicialmente", () => {
    renderLogin();
    expect(screen.queryByTestId("auth-error")).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
describe("LoginPage — interação", () => {
  beforeEach(() => jest.clearAllMocks());

  test("chama login com email e senha ao submeter", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({});
    renderLogin();

    const emailInput = screen.getByTestId("input-email");
    const passwordInput = screen.getByTestId("input-password");
    const submitBtn = screen.getByTestId("submit-auth");

    // Limpa os valores pré-preenchidos e digita novos
    await user.clear(emailInput);
    await user.type(emailInput, "admin@levaportal.com");
    await user.clear(passwordInput);
    await user.type(passwordInput, "admin123");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@levaportal.com", "admin123");
    });
  });

  test("exibe mensagem de erro quando login falha", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: "Credenciais inválidas" } },
    });
    renderLogin();

    await user.click(screen.getByTestId("submit-auth"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toBeInTheDocument();
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Credenciais inválidas");
    });
  });

  test("desabilita o botão enquanto está submetendo", async () => {
    const user = userEvent.setup();
    // Login que nunca resolve (simula loading)
    mockLogin.mockReturnValueOnce(new Promise(() => {}));
    renderLogin();

    await user.click(screen.getByTestId("submit-auth"));

    await waitFor(() => {
      expect(screen.getByTestId("submit-auth")).toBeDisabled();
    });
  });
});

// ----------------------------------------------------------------
describe("LoginPage — redirecionamento", () => {
  test("não renderiza o formulário quando usuário já está logado", () => {
    // Simula usuário autenticado — deve redirecionar
    renderLogin({ user: { id: "1", email: "admin@levaportal.com" }, login: mockLogin, loading: false });
    expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
  });
});
