# Portal LEVA — PRD

## Original problem statement
Plataforma corporativa interna de gestão de conhecimento ("Portal LEVA") para um grupo de concessionárias automotivas com as bandeiras Renault, Geely e Bajaj. O sistema centraliza documentação, processos, treinamentos, onboarding, FAQs, procedimentos operacionais, manuais, biblioteca de arquivos e conhecimento técnico interno. Foco: treinamento de novos colaboradores, padronização de processos, compartilhamento de conhecimento, acesso rápido à informação. Inicialmente local/intranet, mas com arquitetura preparada para nuvem.

## Stack adotada (decisão validada com o usuário)
- Frontend: React 19 + React Router + TailwindCSS + shadcn/ui
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB
- Auth: JWT customizado (httpOnly cookies) com bcrypt
- Storage: Emergent Object Storage (PDFs/imagens/vídeos)
- Editor: Notion-style block editor (custom)
- Idioma: Português Brasil
- Tipografia: Manrope (display) + IBM Plex Sans (body)

## User personas
1. **Administrador** — gerencia usuários, aprova conteúdos, governança total.
2. **Editor** — cria e edita artigos; envios passam por aprovação.
3. **Viewer (colaborador)** — consulta a base de conhecimento e biblioteca.

## Core requirements (estáticos)
- Autenticação segura (hash, JWT, brute-force protection)
- Controle de permissões por papel
- Wiki: CRUD, categorias, tags, busca textual, histórico de versões
- Biblioteca de arquivos: upload/listagem/download de PDFs, imagens, vídeos
- Dashboard com conteúdos recentes, mais acessados e estatísticas
- Painel administrativo (aprovação de conteúdo + gestão de usuários)

## What's been implemented (Atualizado)
- ✅ Backend modular: `auth.py`, `wiki.py`, `files.py`, `users_admin.py`, `storage_client.py`, `server.py`, `training.py`
- ✅ JWT auth com cookies httpOnly, bcrypt, lockout, admin/editor seeded
- ✅ Wiki: CRUD de artigos com blocos (paragraph, h1/h2/h3, bulleted, numbered, quote, code, divider, image), categorias com seed automático, tags, histórico de versões, views, controle de visibilidade por setor.
- ✅ Biblioteca: upload multipart, listagem com filtros, download streaming, soft-delete.
- ✅ Academia (Treinamentos): CRUD de cursos/módulos, acompanhamento de progresso de alunos, provas (quizzes) no final dos módulos e controle de acesso por setor.
- ✅ Admin: aprovação de pendentes, gestão de usuários (papéis e setores).
- ✅ Setores (Departamentos): Implementado sistema de restrição de acesso por setor (TI, Financeiro, Diretoria, Vendas, Pós Vendas) aplicado na Wiki e na Academia. Diretoria e Admins têm acesso global.
- ✅ Dashboard: stats agregadas (total/recent/popular/by_category/users/files)
- ✅ Frontend completo com suporte ao modo escuro e interface moderna (shadcn/ui + Tailwind).

## Prioritized backlog
### P1 (próxima fase imediata)
- Editor de blocos: drag-and-drop para reordenar (atualmente apenas insert/transform)
- Markdown/rich-text inline (negrito, itálico, link) dentro dos blocos
- Upload de imagens diretamente no block editor (bloco "image")
- Tabela de conteúdos (TOC) automático na visualização do artigo
- Reset de senha por email
- Filtros avançados (autor, data, status) na Wiki
- Página de busca dedicada com facets

### P2 (médio prazo)
- IA integrada para sugestões/resumos (Emergent LLM)
- Chatbot interno com RAG sobre a base de conhecimento
- Busca semântica
- Trilhas de aprendizado (sequências de artigos)
- Quizzes ao final de treinamentos
- Analytics: tempo de leitura, taxa de conclusão, mapa de conhecimento por colaborador
- Export de artigos em PDF
- Comentários e reações em artigos

## Decisões arquiteturais relevantes
- **MongoDB com `id` (uuid) ao invés de `_id`**: simplifica serialização JSON e evita vazamento de ObjectId. Todas as queries excluem `_id`.
- **Cookies httpOnly em vez de localStorage**: protege contra XSS. Refresh token de 7 dias + access token de 8h (UX corporativa).
- **Workflow editor → pending → published**: editores publicam para fila de aprovação; apenas admin aprova/rejeita. Mantém qualidade sem bloquear contribuição.
- **Categorias com seed lazy**: na primeira chamada de `/api/wiki/categories`, popula 9 categorias padrão (Onboarding, Processos, Treinamentos, Manuais Técnicos, FAQ, Renault, Geely, Bajaj, Geral).
- **Block editor próprio**: leve, sem dependências pesadas; modelo `[{id,type,content,meta}]` fácil de versionar e migrar.
- **Storage abstraído via `storage_client.py`**: facilita futura troca para S3/R2 sem tocar nas rotas.

## Credenciais de teste
- Admin: `admin@levaportal.com` / `admin123`
- Editor: `editor@levaportal.com` / `editor123`

## Como rodar
- Backend hot-reload via supervisor (`sudo supervisorctl restart backend`)
- Frontend hot-reload (yarn já em execução pelo supervisor)
- Logs: `/var/log/supervisor/backend.*.log`
- DB: MongoDB local em `mongodb://localhost:27017`, db `test_database`
n@levaportal.com` / `admin123`
- Editor: `editor@levaportal.com` / `editor123`

## Como rodar
- Backend hot-reload via supervisor (`sudo supervisorctl restart backend`)
- Frontend hot-reload (yarn já em execução pelo supervisor)
- Logs: `/var/log/supervisor/backend.*.log`
- DB: MongoDB local em `mongodb://localhost:27017`, db `test_database`
