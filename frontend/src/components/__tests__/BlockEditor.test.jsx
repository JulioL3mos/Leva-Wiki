import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlockEditor from "../BlockEditor";

// Mock da API para evitar chamadas reais
jest.mock("../../lib/api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  API_BASE: "http://localhost:8000/api",
}));

// Helper: renderiza o editor com um conjunto inicial de blocos
function renderEditor(blocks, onChange = jest.fn()) {
  return render(<BlockEditor blocks={blocks} onChange={onChange} />);
}

const paragraph = (content = "") => ({
  id: "p1",
  type: "paragraph",
  content,
  meta: {},
});

const bulletedBlock = (content = "Item") => ({
  id: "b1",
  type: "bulleted",
  content,
  meta: {},
});

const numberedBlock = (content = "Item") => ({
  id: "n1",
  type: "numbered",
  content,
  meta: {},
});

// ----------------------------------------------------------------
describe("BlockEditor — renderização inicial", () => {
  test("renderiza o editor sem erros com um bloco vazio", () => {
    renderEditor([paragraph()]);
    expect(screen.getByTestId("block-editor")).toBeInTheDocument();
  });

  test("exibe o input de parágrafo", () => {
    renderEditor([paragraph()]);
    const input = screen.getByTestId("block-input-p1");
    expect(input).toBeInTheDocument();
  });

  test("exibe o marcador '•' para bloco bulleted", () => {
    renderEditor([bulletedBlock()]);
    expect(screen.getByText("•")).toBeInTheDocument();
  });

  test("exibe o número '1.' para o primeiro item de lista numerada", () => {
    renderEditor([numberedBlock()]);
    expect(screen.getByText("1.")).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
describe("BlockEditor — menu de slash '/'", () => {
  test("abre o menu de slash ao digitar '/'", async () => {
    const user = userEvent.setup();
    renderEditor([paragraph()]);
    const input = screen.getByTestId("block-input-p1");
    await user.type(input, "/");
    expect(await screen.findByText(/Transformar em/i)).toBeInTheDocument();
  });

  test("fecha o menu de slash ao pressionar Escape", async () => {
    const user = userEvent.setup();
    renderEditor([paragraph()]);
    const input = screen.getByTestId("block-input-p1");
    await user.type(input, "/");
    await screen.findByText(/Transformar em/i);
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText(/Transformar em/i)).not.toBeInTheDocument();
    });
  });
});

// ----------------------------------------------------------------
describe("BlockEditor — comportamento de Enter nas listas", () => {
  test("Enter em lista bulleted com conteúdo cria novo bloco bulleted", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderEditor([bulletedBlock("Item 1")], onChange);
    const input = screen.getByTestId("block-input-b1");
    await user.click(input);
    await user.keyboard("{Enter}");
    // onChange deve ser chamado com 2 blocos, ambos 'bulleted'
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(2);
    expect(lastCall[1].type).toBe("bulleted");
  });

  test("Enter em lista bulleted vazia transforma em parágrafo", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderEditor([bulletedBlock("")], onChange);
    const input = screen.getByTestId("block-input-b1");
    await user.click(input);
    await user.keyboard("{Enter}");
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].type).toBe("paragraph");
  });

  test("Enter em lista numerada com conteúdo cria novo bloco numbered", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderEditor([numberedBlock("Item 1")], onChange);
    const input = screen.getByTestId("block-input-n1");
    await user.click(input);
    await user.keyboard("{Enter}");
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(2);
    expect(lastCall[1].type).toBe("numbered");
  });
});

// ----------------------------------------------------------------
describe("BlockEditor — comportamento de Backspace", () => {
  test("Backspace em bloco não-parágrafo vazio o transforma em parágrafo", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderEditor([bulletedBlock("")], onChange);
    const input = screen.getByTestId("block-input-b1");
    await user.click(input);
    await user.keyboard("{Backspace}");
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].type).toBe("paragraph");
  });
});
