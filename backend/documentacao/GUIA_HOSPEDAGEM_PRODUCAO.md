# Guia de Hospedagem em Produção - Portal LEVA

Este documento reúne tudo o que você precisa para colocar o Portal LEVA em um servidor de produção, usando Docker Compose, domínio, HTTPS e boas práticas de segurança.

---

## 1. Cenário recomendado

A implantação recomendada para produção é:

- Servidor Linux (Ubuntu 22.04 ou 24.04)
- Docker + Docker Compose
- Nginx como proxy reverso
- Certificado SSL via Let's Encrypt
- MongoDB rodando em container próprio
- Persistência de uploads e dados do banco
- Domínio apontando para o servidor

---

## 2. Requisitos do servidor

### Recursos mínimos recomendados
- CPU: 2 vCPUs
- RAM: 4 GB
- Disco: 50 GB SSD
- Sistema operacional: Ubuntu 22.04/24.04
- Acesso root ou sudo

### Portas abertas
- 22/TCP: SSH
- 80/TCP: HTTP
- 443/TCP: HTTPS
- 27017/TCP: MongoDB (somente se você quiser acesso externo; idealmente não expor)
- 8000/TCP: backend (pode ficar apenas interno, via Nginx)

> Em produção, o ideal é deixar o backend acessível apenas internamente e expor apenas o frontend via Nginx.

---

## 3. Preparação do servidor

### Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Docker e Docker Compose

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Habilitar Docker para o usuário atual

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Verificar instalação

```bash
docker --version
docker compose version
```

---

## 4. Preparar o domínio

Antes de subir a aplicação:

1. Crie o registro A no DNS apontando seu domínio para o IP do servidor.
2. Exemplo:
   - `seu-dominio.com` -> IP do servidor
   - `www.seu-dominio.com` -> IP do servidor

Exemplo de DNS:
- `A` -> `seu-dominio.com` -> `203.0.113.10`
- `A` -> `www.seu-dominio.com` -> `203.0.113.10`

---

## 5. Clonar o projeto no servidor

```bash
cd /opt
sudo git clone https://github.com/seu-usuario/seu-repositorio.git leva-wiki
cd leva-wiki
```

Se o projeto já estiver no servidor, use:

```bash
cd /opt/leva-wiki
git pull
```

---

## 6. Configurar as variáveis de ambiente

O backend lê as variáveis do arquivo `backend/.env`.

Crie ou edite esse arquivo com valores reais de produção:

```bash
cd /opt/leva-wiki/backend
nano .env
```

Exemplo de conteúdo:

```env
MONGO_URL=mongodb://mongodb:27017
DB_NAME=LEVA_DB
JWT_SECRET=gere_uma_chave_muito_segura_aqui
FRONTEND_URL=https://seu-dominio.com
ADMIN_EMAIL=admin@seu-dominio.com
ADMIN_PASSWORD=senha_forte_e_unica
ADMIN_NAME=Administrador LEVA
```

### Regras importantes
- Troque `JWT_SECRET` por um valor aleatório e forte.
- Use uma senha forte para o admin.
- Defina `FRONTEND_URL` com o domínio real da aplicação.

> Se você usar HTTPS, o `FRONTEND_URL` deve apontar para o domínio com `https://`.

---

## 7. Ajustar o Docker Compose para produção

O arquivo atual já suporta containers para backend, frontend e MongoDB, mas vale revisar alguns pontos antes da implantação.

### Valores recomendados

No arquivo `docker-compose.yml`:

- `FRONTEND_URL` deve ser seu domínio real.
- `JWT_SECRET` deve ser um valor seguro.
- O backend pode continuar exposto na porta 8000 para uso interno ou externo, mas o mais seguro é deixá-lo apenas para o Nginx ou rede interna.

Exemplo de configuração de ambiente no compose:

```yaml
environment:
  - MONGO_URL=mongodb://mongodb:27017
  - DB_NAME=LEVA_DB
  - JWT_SECRET=sua_chave_forte
  - FRONTEND_URL=https://seu-dominio.com
  - ADMIN_EMAIL=admin@seu-dominio.com
  - ADMIN_PASSWORD=senha_forte
  - ADMIN_NAME=Administrador LEVA
```

---

## 8. Configurar o Nginx como proxy reverso

O frontend pode ser acessado diretamente pela porta 80/443, mas o ideal é usar o Nginx para encaminhar o tráfego para o container do frontend e também proteger a API.

### Instalar Nginx

```bash
sudo apt install -y nginx
```

### Criar o arquivo de configuração

```bash
sudo nano /etc/nginx/sites-available/leva
```

Exemplo de configuração:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Ativar a configuração

```bash
sudo ln -s /etc/nginx/sites-available/leva /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> Em ambientes mais avançados, você pode usar o Nginx para encaminhar `/api` diretamente para o backend na porta 8000.

---

## 9. Instalar SSL com Let's Encrypt

### Instalar certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Gerar certificado

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

O Certbot vai:
- gerar o certificado
- ajustar o Nginx
- habilitar renovação automática

### Verificar renovação

```bash
sudo certbot renew --dry-run
```

---

## 10. Subir a aplicação com Docker Compose

No diretório do projeto:

```bash
cd /opt/leva-wiki
docker compose up -d --build
```

### Verificar containers

```bash
docker compose ps
```

### Verificar logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Acessar a aplicação

- Frontend: `https://seu-dominio.com`
- API: `https://seu-dominio.com/api`
- Swagger: `https://seu-dominio.com/docs`

> Se o frontend estiver atrás do Nginx e o backend estiver no container, o path `/api` deve ser encaminhado corretamente para o serviço backend.

---

## 11. Verificações pós-instalação

### Testar o backend

```bash
curl http://localhost:8000/api/health
```

### Testar o frontend

```bash
curl -I http://localhost
```

### Testar o login inicial

Acesse o domínio e faça login com as credenciais do admin configuradas no `.env`.

---

## 12. Persistência e backup

### Dados que devem ser preservados
- Banco MongoDB
- Pasta de uploads do backend
- Arquivos de configuração do Nginx e SSL

### Backup do MongoDB

Se você quiser fazer backup manual:

```bash
docker compose exec mongodb mongodump --out /data/backup
```

### Backup dos uploads

Os uploads ficam no volume `backend_uploads` e devem ser copiados periodicamente.

### Backup simples do servidor

```bash
tar -czf backup-leva-$(date +%F).tar.gz /opt/leva-wiki /etc/nginx /etc/letsencrypt
```

---

## 13. Atualização da aplicação

Quando houver nova versão:

```bash
cd /opt/leva-wiki
git pull
docker compose down
docker compose up -d --build
```

Se quiser manter os dados e apenas rebuildar:

```bash
docker compose up -d --build
```

---

## 14. Checklist de segurança para produção

Antes de colocar em uso real, confirme:

- [ ] `JWT_SECRET` está configurado com valor forte
- [ ] `FRONTEND_URL` aponta para o domínio correto
- [ ] HTTPS está ativo com certificado válido
- [ ] O usuário administrador foi trocado para uma senha forte
- [ ] O MongoDB não está exposto publicamente sem autenticação
- [ ] O servidor tem firewall configurado
- [ ] Há backup periódico de dados e uploads
- [ ] O Nginx está redirecionando HTTP para HTTPS
- [ ] O sistema foi testado com login, criação de artigo e upload

---

## 15. Recomendações extras

### Firewall UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Melhor prática opcional

Se o servidor for importante, considere:
- monitoramento com Uptime Kuma ou Grafana
- logs centralizados
- snapshots do servidor
- atualização automática de sistema e Docker

---

## 16. Problemas comuns

### O frontend não carrega
- Verifique se o container do frontend subiu corretamente
- Confirme o DNS e o SSL
- Veja os logs com `docker compose logs frontend`

### A API não responde
- Confirme se o backend subiu com `docker compose ps`
- Verifique `docker compose logs backend`
- Confirme se o MongoDB está ativo

### Erro de CORS
- Ajuste `FRONTEND_URL` no `.env` para o domínio exato usado pelo navegador
- Inclua `https://seu-dominio.com`

### Uploads não funcionam
- Confirme se o volume `backend_uploads` existe
- Verifique permissões da pasta do volume
- Verifique os logs do backend

---

## 17. Resumo operacional

Para colocar o Portal LEVA em produção, você precisará de:

1. servidor Ubuntu com Docker
2. domínio configurado
3. Nginx + SSL
4. arquivo `.env` com valores reais
5. Docker Compose rodando os serviços
6. backup do banco e uploads
7. validação do fluxo completo de login e uso

Se tudo estiver correto, o sistema deve ficar disponível em produção com uma URL segura e estável.
