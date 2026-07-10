# Documentação Técnica - Portal LEVA

Este documento consolida a arquitetura, os parâmetros de execução e os módulos implementados no portal LEVA, com foco em um ambiente corporativo de wiki, biblioteca de arquivos e academia interna.

## Visão geral

O projeto está dividido em dois blocos principais:

1. Backend em Python com FastAPI, responsável por autenticação, regras de negócio, persistência no MongoDB e armazenamento local de arquivos.
2. Frontend em React com Tailwind e componentes baseados em shadcn/ui, responsável pela experiência de navegação, edição de artigos, gestão de cursos e administração.

---

## Stack atual

### Backend
- Python 3.11+ (ambiente atual usado no projeto)
- FastAPI 0.110.1
- Uvicorn 0.25.0
- Motor / AsyncIOMotorClient para MongoDB
- Pydantic 2.x
- PyJWT, bcrypt e python-dotenv
- python-multipart para upload de arquivos

### Frontend
- React 19
- React Router DOM 7
- CRA + CRACO para build e execução
- Tailwind CSS 3
- Radix UI primitives
- Axios para comunicação com a API
- React Markdown, Sonner, Lucide Icons e drag-and-drop para o editor

### Banco de dados
- MongoDB em execução localmente ou via container
- Coleções principais: users, articles, article_versions, categories, files, courses, modules, user_progress, quiz_results, login_attempts

---

## Estrutura de pastas

### Backend
- backend/server.py: bootstrap da API, conexão com MongoDB, CORS e inicialização de índices/seed.
- backend/auth.py: autenticação, cookies httpOnly, JWT, controle por papel e setor, bloqueio por tentativa de login e seed de usuários.
- backend/wiki.py: CRUD de artigos, categorias, tags, versões, upload de imagens para o editor e estatísticas do dashboard.
- backend/training.py: gestão de cursos, módulos, quizzes, progresso e submissão de respostas.
- backend/files.py: biblioteca de arquivos com upload, listagem, download e controle de visibilidade por setor.
- backend/storage_client.py: armazenamento local em backend/uploads.
- backend/requirements.txt: dependências Python.

### Frontend
- frontend/src/App.js: definição das rotas principais.
- frontend/src/lib/api.js: cliente central de comunicação com o backend.
- frontend/src/components/BlockEditor.jsx: editor visual de blocos da Wiki.
- frontend/src/pages/: telas de login, dashboard, wiki, artigo, biblioteca, academia, perfil e administração.

---

## Configurações atuais do projeto

### Variáveis de ambiente
As configurações são carregadas via arquivo backend/.env.

- MONGO_URL: mongodb://localhost:27017
- DB_NAME: LEVA_DB
- JWT_SECRET: chave usada para assinar tokens JWT
- FRONTEND_URL: lista de origens permitidas separadas por vírgula, por exemplo http://localhost:3000,https://seu-tunel.ngrok-free.dev
- ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME: credenciais do usuário administrador inicial

### Portas e serviços
- MongoDB: 27017
- Backend: 8000
- Frontend: 80 quando executado via Docker; em desenvolvimento local geralmente 3000 via CRA/CRACO

### Containers Docker
O compose atual monta:
- mongodb
- backend
- frontend

Os volumes persistem:
- mongodb_data
- backend_uploads

---

## Funcionalidades implementadas

### 1. Autenticação e autorização
- Login com email/senha
- Geração de access/refresh tokens
- Cookies httpOnly para acesso seguro
- Proteção por papéis: admin, editor e viewer
- Restrição por departamento/setor
- Troca de senha e atualização de perfil
- Seed automático de administrador e usuário editor
- Proteção contra brute force em tentativas de login

### 2. Wiki corporativa
- CRUD completo de artigos
- Editor de blocos com suporte a:
  - texto
  - títulos H1/H2/H3
  - listas bulleted e numbered
  - citação
  - código
  - divisor
  - imagem
- Upload de imagens diretamente no corpo dos artigos
- Categorias e tags
- Filtros dinâmicos por categoria e tag
- Controle de visibilidade por setor
- Versionamento de artigos
- Contagem de visualizações por rota dedicada
- Status de artigo: draft, pending e published

### 3. Academia / treinamentos
- Cadastro de cursos
- Módulos de conteúdo e quizzes
- Progresso por usuário
- Submissão de quizzes com pontuação e aprovação
- Controle por setor e função alvo
- Visualização de cursos em tela dedicada

### 4. Biblioteca de arquivos
- Upload de arquivos com tipos permitidos
- Armazenamento local em backend/uploads
- Organização em subpastas para articles e library
- Listagem, download e exclusão lógica
- Controle de visibilidade por setor

### 5. Painel administrativo
- Gestão de usuários
- Reset de senha por administrador
- Criação e edição de categorias
- Revisão de conteúdos pendentes e status de publicação

### 6. Experiência do usuário
- Dashboard com métricas básicas
- Tema claro/escuro
- Busca e navegação por rotas protegidas
- Toasts e feedback visual para ações do usuário

---

## Rotas principais da API

### Autenticação
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/change-password
- PATCH /api/auth/update-profile
- POST /api/auth/refresh

### Wiki
- POST /api/wiki/articles
- GET /api/wiki/articles
- GET /api/wiki/articles/{article_id}
- PATCH /api/wiki/articles/{article_id}
- DELETE /api/wiki/articles/{article_id}
- POST /api/wiki/articles/{article_id}/view
- GET /api/wiki/articles/{article_id}/versions
- GET /api/wiki/categories
- POST /api/wiki/categories
- GET /api/wiki/tags
- POST /api/wiki/images/upload
- GET /api/dashboard/stats

### Treinamentos
- GET /api/training/courses
- POST /api/training/courses
- GET /api/training/courses/{course_id}
- PATCH /api/training/courses/{course_id}
- DELETE /api/training/courses/{course_id}
- POST /api/training/modules
- PATCH /api/training/modules/{module_id}
- DELETE /api/training/modules/{module_id}
- POST /api/training/modules/{module_id}/questions
- GET /api/training/progress
- POST /api/training/modules/{module_id}/complete
- POST /api/training/modules/{module_id}/submit

### Arquivos
- POST /api/files/upload
- GET /api/files
- GET /api/files/{file_id}/download
- GET /api/files/raw/{path}
- DELETE /api/files/{file_id}

---

## Armazenamento de arquivos

Atualmente o projeto usa armazenamento local, sem depender de cloud externa.

- Diretório base: backend/uploads
- Estrutura usada:
  - backend/uploads/portal-leva/articles/...
  - backend/uploads/portal-leva/library/...

A lógica está centralizada em backend/storage_client.py, que grava os arquivos em disco local e expõe leitura por caminho.

---

## Segurança e boas práticas

### Implementado
- Tokens com expiração e cookies httpOnly
- Hash de senha com bcrypt
- Controle por papel e setor
- Seed de administrador inicial
- Bloqueio temporário por excesso de tentativas de login
- CORS configurado com múltiplas origens via FRONTEND_URL

### Pontos que ainda merecem atenção
- Em produção, definir JWT_SECRET com valor forte e único
- Restringir FRONTEND_URL ao domínio oficial da empresa
- Considerar scans antivírus e políticas de retenção para uploads
- Manter o MongoDB com autenticação e rede restrita

---

## Como executar localmente

### Backend
1. Ter o MongoDB rodando em localhost:27017
2. Criar o ambiente virtual: python -m venv venv
3. Ativar o ambiente: .\venv\Scripts\activate
4. Instalar dependências: pip install -r backend/requirements.txt
5. Definir as variáveis em backend/.env
6. Iniciar: python backend/server.py

### Frontend
1. Instalar dependências: yarn install ou npm install --legacy-peer-deps
2. Iniciar o ambiente de desenvolvimento: yarn start ou npm start

### Docker Compose
No diretório raiz do projeto:

```bash
docker-compose up -d --build
```

A aplicação fica disponível em:
- Frontend: http://localhost
- Backend: http://localhost:8000
- Documentação Swagger: http://localhost:8000/docs

---

## Resumo do estado atual

O projeto já conta com um conjunto funcional de recursos para uso corporativo, incluindo:
- autenticação segura
- wiki com editor visual
- biblioteca documental
- academia interna
- gestão administrativa
- armazenamento local
- controle de visibilidade por setor

Este documento deve ser atualizado sempre que houver novas rotas, novas permissões, novos módulos ou mudanças relevantes de infraestrutura.
