# Documentação Técnica - Portal LEVA

Este documento serve como guia para desenvolvedores e administradores do sistema Portal LEVA. O sistema é uma Wiki corporativa com editor de blocos (estilo Notion) e gerenciamento de biblioteca de arquivos.

## 🚀 Arquitetura Geral

O projeto é dividido em duas partes principais:

1.  **Backend (Python + FastAPI):** API assíncrona que gerencia o banco de dados MongoDB, autenticação e armazenamento de arquivos.
2.  **Frontend (React + Tailwind):** Interface do usuário moderna com componentes [shadcn/ui](https://ui.shadcn.com/).

---

## 🛠️ Stack Tecnológica

- **Linguagens:** Python 3.14+, JavaScript (React 19)
- **Banco de Dados:** MongoDB (via Motor/AsyncIOMotorClient)
- **Autenticação:** JWT (JSON Web Tokens) com cookies `httpOnly` para segurança contra XSS.
- **Estilização:** TailwindCSS + Lucide Icons.

---

## 📂 Estrutura de Pastas e Arquivos Chave

### Backend (`/backend`)
- `server.py`: Ponto de entrada da API, configuração de CORS e carregamento de rotas.
- `auth.py`: Lógica de login, registro, proteção de rotas por cargos (Admin/Editor/Viewer) e hashing de senhas com `bcrypt`.
- `wiki.py`: CRUD de artigos, gerenciamento de categorias e o novo sistema de upload de imagens para o editor.
- `files.py`: Gerenciamento da biblioteca de arquivos.
- `storage_client.py`: Abstração de armazenamento. Atualmente configurado para **Armazenamento Local** na pasta `backend/uploads`.
- `requirements.txt`: Dependências do Python.

### Frontend (`/frontend`)
- `src/App.js`: Configuração das rotas (Dashboard, Wiki, Admin, etc).
- `src/lib/api.js`: Cliente central para chamadas ao backend.
- `src/components/BlockEditor.jsx`: Componente central do editor. Gerencia blocos de texto, títulos, listas, código e **Imagens**.
- `src/pages/`: Páginas completas do sistema.

---

## 🔒 Segurança e Vulnerabilidades

### O que já está implementado:
1.  **Cookies httpOnly:** O token de acesso não pode ser lido por scripts do navegador, prevenindo roubo de sessão.
2.  **Hashing de Senha:** Senhas são salvas com `bcrypt`.
3.  **Controle de Acesso:** Rotas sensíveis (como criar categorias ou deletar usuários) exigem papel de `admin`.

### Pontos de atenção para o futuro:
1.  **CORS:** Em produção, o `FRONTEND_URL` deve ser restrito ao domínio oficial da empresa.
2.  **Uploads:** Implementamos uma verificação básica de tipo de arquivo (`ALLOWED_TYPES`), mas para produção é recomendável uma análise de vírus/malware nos arquivos subidos.
3.  **MongoDB:** Certifique-se de que o banco tenha usuário/senha e não esteja exposto à internet.

---

## 📦 Como Rodar (Localmente na Empresa)

### Backend
1. Ter o MongoDB rodando em `localhost:27017`.
2. Criar e ativar o ambiente virtual: `python -m venv venv` -> `.\venv\Scripts\activate`.
3. Instalar dependências: `pip install -r backend/requirements.txt`.
4. Criar `.env` baseado no `.env.example`.
5. Rodar: `python backend/server.py`.

### Frontend
1. Ter o Node.js v24+ instalado.
2. Instalar dependências: `yarn install` (recomendado) ou `npm install --legacy-peer-deps`.
3. Criar `.env` baseado no `.env.example`.
4. Rodar: `yarn start` ou `npm start`.

---

## 📝 Histórico de Customizações Recentes
- **Upload Local:** Removida dependência de nuvem (Emergent Storage). Arquivos agora ficam em `backend/uploads`.
- **Imagens no Editor:** Adicionado suporte para inserir prints e fotos diretamente no corpo dos artigos da Wiki.
- **Limpeza de Dependências:** Removidas bibliotecas incompatíveis com Python 3.14 (numpy/pandas) que não eram utilizadas.
