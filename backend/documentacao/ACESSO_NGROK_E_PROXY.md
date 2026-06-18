# Acesso externo via ngrok — alterações de proxy e CORS

Este documento descreve as mudanças feitas para permitir que pessoas externas acessem o Portal LEVA por um link ngrok, sem que o navegador delas tente chamar `localhost:8000` (máquina do visitante) e sem erros de CORS.

---

## Problema original

Ao compartilhar o sistema por ngrok, dois erros apareciam no console do navegador:

1. **URL da API fixa em `localhost:8000`** — o frontend chamava `http://localhost:8000/api/...`. Para quem abre o link ngrok, `localhost` é o computador **deles**, não o servidor onde o backend roda.

2. **CORS restrito** — o backend aceitava apenas a origem configurada em `FRONTEND_URL` (ex.: `http://localhost:3000`), bloqueando requisições vindas do domínio ngrok (`https://....ngrok-free.dev`).

### Cenário real do projeto

O ambiente em uso é **Docker Compose**, não `yarn start` local:

| Serviço   | Porta exposta | Tecnologia        |
|-----------|---------------|-------------------|
| Frontend  | **80**        | Nginx + build React |
| Backend   | 8000          | FastAPI (Uvicorn) |
| MongoDB   | 27017         | Mongo             |

Por isso o túnel ngrok deve apontar para a porta **80**, não 3000.

O proxy configurado no **Craco** (`craco.config.js`) só vale para desenvolvimento local (`yarn start`). No Docker, quem faz o proxy é o **Nginx**.

---

## Solução adotada

A API passa a ser chamada com **URL relativa** (`/api/...`). O mesmo domínio que serve o frontend também encaminha `/api` para o backend — o visitante nunca precisa conhecer `localhost:8000`.

```
Visitante → https://xxx.ngrok-free.dev
                │
                ├─ /           → Nginx → arquivos React (HTML/JS)
                └─ /api/...    → Nginx → proxy → backend:8000 (container)
```

Com isso, as requisições são **same-origin** (mesmo domínio ngrok) e o CORS deixa de ser um obstáculo no fluxo principal.

---

## Arquivos alterados

### 1. `frontend/src/lib/api.js`

**Antes:** `API_BASE` era sempre `${REACT_APP_BACKEND_URL}/api`, normalmente `http://localhost:8000/api` (gravado no build).

**Depois:**
- Se `REACT_APP_BACKEND_URL` estiver vazio ou apontar para `localhost`, usa **`/api`** (relativo).
- Só usa URL absoluta quando aponta para um host externo (ex.: segundo túnel ngrok dedicado ao backend).

```js
const configured = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/$/, "");
const useDirectBackend =
  configured && !/^https?:\/\/localhost(:\d+)?$/i.test(configured);
const BACKEND_URL = useDirectBackend ? configured : "";
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";
```

### 2. `frontend/nginx.conf` (novo)

Configuração do Nginx no container do frontend:

- `location /api` → proxy para `http://backend:8000` (nome do serviço no Docker Compose).
- `location /` → arquivos estáticos do React + fallback para `index.html` (React Router).

### 3. `frontend/Dockerfile`

- Passa `ARG REACT_APP_BACKEND_URL=` vazio no build para não embutir `localhost:8000` no JavaScript.
- Copia `nginx.conf` para `/etc/nginx/conf.d/default.conf` em vez de gerar config inline sem proxy.

### 4. `docker-compose.yml`

- Removida variável `REACT_APP_API_URL` (nome incorreto; o código usa `REACT_APP_BACKEND_URL`).
- Adicionado `build.args.REACT_APP_BACKEND_URL: ""` para garantir build com URL relativa.

### 5. `frontend/src/pages/FilesPage.jsx`

Link de download de arquivo alterado de URL absoluta para relativa:

```jsx
href={`/api/files/${f.id}/download`}
```

### 6. `frontend/craco.config.js` (desenvolvimento local)

Quando rodar `yarn start` (porta 3000), sem Docker:

- `allowedHosts: "all"` — permite acesso via ngrok ao dev server.
- Proxy `/api` → `http://localhost:8000` — mesmo comportamento do Nginx, mas em dev.

### 7. `backend/server.py`

`FRONTEND_URL` passa a aceitar **várias origens separadas por vírgula**:

```env
FRONTEND_URL=http://localhost:3000,https://seu-tunel.ngrok-free.dev
```

Útil apenas se usar **dois túneis ngrok** (frontend e backend separados). No fluxo com um único túnel + proxy, o CORS não é acionado para chamadas `/api`.

---

## Como usar com ngrok (Docker — recomendado)

### 1. Subir os containers

```bash
docker compose up -d --build
```

Após alterações no frontend, force rebuild sem cache:

```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

### 2. Criar túnel na porta 80

```bash
ngrok http 80
```

### 3. Compartilhar a URL HTTPS gerada

Exemplo: `https://concise-spellbind-passive.ngrok-free.dev`

### 4. Verificar no navegador

No DevTools → Network, as chamadas devem ir para:

```
https://seu-tunel.ngrok-free.dev/api/auth/login
```

**Não** devem aparecer requisições para `http://localhost:8000`.

Se ainda aparecer `localhost:8000`, limpe o cache do navegador (`Ctrl+Shift+R`) ou use aba anônima — o JavaScript antigo pode estar em cache.

---

## Como usar com ngrok (desenvolvimento local, sem Docker)

```bash
# Terminal 1 — backend
cd backend
python server.py

# Terminal 2 — frontend
cd frontend
yarn start

# Terminal 3 — ngrok na porta 3000
ngrok http 3000
```

O proxy do Craco encaminha `/api` para `localhost:8000` na sua máquina.

---

## Alternativa: dois túneis ngrok

Se preferir túneis separados para frontend e backend:

```bash
ngrok http 80    # ou 3000 em dev
ngrok http 8000  # backend
```

**`frontend/.env` (ou build arg):**
```env
REACT_APP_BACKEND_URL=https://SEU-TUNEL-BACKEND.ngrok-free.dev
```

**`backend/.env` (ou variável no docker-compose):**
```env
FRONTEND_URL=http://localhost,https://SEU-TUNEL-FRONTEND.ngrok-free.dev
```

Reinicie frontend e backend após alterar as variáveis.

> **Cookies em HTTPS:** nesse modo cross-origin, pode ser necessário ajustar cookies (`secure=True`, `samesite="none"`) em `backend/auth.py`. O fluxo com proxy (um túnel) evita esse problema.

---

## Checklist de troubleshooting

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| CORS + `localhost:8000` no console | Build antigo ou cache do navegador | `docker compose build --no-cache frontend` + hard refresh |
| ngrok na porta 3000 com Docker | Frontend Docker está na porta 80 | `ngrok http 80` |
| 502 no ngrok | Container frontend/backend parado | `docker compose ps` e `docker compose up -d` |
| `/api/health` falha localmente | Nginx sem proxy ou backend down | `curl http://localhost/api/health` deve retornar 200 |

---

## Resumo das portas

| Modo              | ngrok aponta para | Proxy de `/api`        |
|-------------------|-------------------|-------------------------|
| Docker Compose    | **80**            | Nginx (`nginx.conf`)    |
| `yarn start`      | **3000**          | Craco dev server        |
| Dois túneis       | 80/3000 + 8000    | Sem proxy; CORS necessário |
