# PREFERRED EXECUTION COMMANDS
- Testes Unitários: `npm run test:unit` (Não use apenas `jest`)
- Testes E2E: `npm run test:e2e`
- Lint: `npm run lint:fix`
- Banco de Dados: Use o Docker Compose local, não tente conectar em prod.

## Projeto atual: plataforma de ia (Vite + Supabase)
- Instalação: `npm --prefix "plataforma de ia" install`
- Desenvolvimento: `npm --prefix "plataforma de ia" run dev`
- Build: `npm --prefix "plataforma de ia" run build`
- Lint: `npm --prefix "plataforma de ia" run lint`
- Testes: `npm --prefix "plataforma de ia" run test:unit`

## Outros Projetos:
### webapp-cms (Next.js + Supabase)
- Instalação: `npm --prefix "prova social/webapp-cms" install`
- Desenvolvimento: `npm --prefix "prova social/webapp-cms" run dev`
- Build: `npm --prefix "prova social/webapp-cms" run build`
- Schema Supabase: executar `prova social/webapp-cms/supabase/schema.sql`
- Importação em lote: `python "prova social/execution/import_testimonials.py" --csv <arquivo.csv> --publish-default`