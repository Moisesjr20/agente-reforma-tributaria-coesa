# PREFERRED EXECUTION COMMANDS

## Projeto atual: frontend (Vite + React + Vitest)

```bash
# Instalação
npm --prefix frontend install

# Desenvolvimento
npm --prefix frontend run dev

# Build
npm --prefix frontend run build

# Testes (run único)
npm --prefix frontend run test

# Testes (watch mode)
npm --prefix frontend run test:watch

# Lint (se configurado)
npm --prefix frontend run lint
```

## Edge Function (Deno — Supabase)

```bash
# Testes da Edge Function
deno test supabase/functions/ask-reforma/index.test.ts --allow-env

# Deploy (via script PowerShell)
./execution/rag-reforma/deploy-edge-function.ps1
```

## Ingestão RAG (Python)

```bash
# Instalar dependências
pip install -r execution/rag-reforma/requirements.txt

# Ingerir todos os documentos
python execution/rag-reforma/update_knowledge_base.py

# Ingerir apenas um slug
python execution/rag-reforma/update_knowledge_base.py --slug lcp-214

# Simular sem inserir no banco
python execution/rag-reforma/update_knowledge_base.py --dry-run

# Testes unitários do pipeline
python -m pytest execution/rag-reforma/test_update_knowledge_base.py -v
```

## Banco de Dados

- Use o Supabase local via CLI (`supabase start`) ou o projeto remoto via `.env`.
- **Nunca** conecte diretamente ao banco de produção sem `--dry-run` validado.
- Migrations em `supabase/migrations/` — aplicar via `supabase db push`.
