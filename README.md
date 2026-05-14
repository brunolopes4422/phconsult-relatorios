# PH Consult Pro

Sistema interno para geração e envio de relatórios financeiros via WhatsApp.

## Stack
- Frontend: React + Vite + TailwindCSS → Vercel
- Backend: Node.js + Express → Railway
- Banco: Supabase (PostgreSQL)

---

## Setup inicial

### 1. Banco de dados (Supabase)
1. Acesse seu projeto Supabase
2. Vá em **SQL Editor → New query**
3. Cole e execute o conteúdo de `schema.sql`
4. Anote a **Service Role Key** em Settings → API → service_role

### 2. Backend (Railway)
1. Crie um novo projeto no Railway
2. Conecte o repositório (pasta `backend/`)
3. Configure as variáveis de ambiente do `ENV_VARS.txt`
4. Deploy automático — anote a URL gerada (ex: `https://ph-backend.railway.app`)

### 3. Frontend (Vercel)
1. Crie um novo projeto no Vercel
2. Conecte o repositório (pasta `frontend/`)
3. Configure `VITE_API_URL=https://SUA-URL-RAILWAY.railway.app/api`
4. Deploy → domínio: `ph-consult-pro.vercel.app`

### 4. Primeiro acesso
1. Acesse `https://ph-consult-pro.vercel.app/setup`
2. Crie o usuário administrador
3. Faça login e vá em **Configurações** para selecionar a conexão WhatsApp

---

## Fluxo de uso
1. Cadastrar cliente em `/clients`
2. Abrir o cliente e conectar Conta Azul (botão "Conectar")
3. Adicionar destinatários WhatsApp do cliente
4. No Dashboard, clicar "Gerar relatório"
5. Selecionar período, revisar mensagem, selecionar destinatários, enviar

## Desenvolvimento local

```bash
# Backend
cd backend
cp .env.example .env  # preencha as variáveis
npm install
npm run dev  # porta 3001

# Frontend
cd frontend
cp .env.example .env  # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev  # porta 5173
```
