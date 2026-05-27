---
name: obsidian-notes
framework: doe
description: Criar, ler, buscar e atualizar notas no vault Obsidian sincronizado via GitHub. Use quando o usuário pedir para criar uma nota, salvar uma ideia, buscar uma anotação, listar notas, ver o conteúdo de uma nota, atualizar uma nota, ou mencionar "obsidian", "vault", "nota", "anotação", "salvar ideia", "minhas notas".
metadata:
  version: 1.0.0
  author: GueClaw System
  category: productivity
---

# Obsidian Notes Skill

> **Operação DOE** — Esta skill segue a arquitetura DOE. Toda execução obedece ao fluxo: **Análise → Plano → Aprovação → Execução → Review**. Quando um script falhar, aplique o loop de self-annealing: corrija, teste, atualize esta skill.

---

## Visão Geral

O vault Obsidian do usuário é um repositório Git privado sincronizado entre:
- **Windows (local):** Obsidian Git plugin faz push automático das mudanças (`D:\Clientes de BI\Gueclaw-obsidian\`)
- **VPS (`/opt/obsidian-vault`):** O agente lê e escreve arquivos `.md` via SSH/comandos
- **GitHub (`Moisesjr20/meu-vault-obsidian`):** ponte central de sincronização

## ⚠️ Estrutura do Repositório

```
/opt/obsidian-vault/          ← raiz do Git (OBSIDIAN_VAULT_PATH)
└── GueClaw/                  ← vault real onde ficam as NOTAS (.md)
      └── .obsidian/          ← config do Obsidian (não modificar)
```

> **IMPORTANTE:** Todas as notas ficam em `/opt/obsidian-vault/GueClaw/`, NÃO na raiz `/opt/obsidian-vault/`.
> Variável de conveniência: `NOTES_DIR=/opt/obsidian-vault/GueClaw`

## Configuração de Ambiente

```
OBSIDIAN_VAULT_PATH=/opt/obsidian-vault        (raiz do repo Git na VPS)
NOTES_DIR=/opt/obsidian-vault/GueClaw          (diretório real das notas)
OBSIDIAN_GITHUB_TOKEN=ghp_...                  (PAT com acesso ao repo privado)
OBSIDIAN_VAULT_REPO=https://github.com/Moisesjr20/meu-vault-obsidian.git
```

---

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE** faça `git pull` antes de ler ou criar qualquer nota (garantir dados atualizados).
2. **SEMPRE** faça `git add + commit + push` após criar ou editar uma nota.
3. Use `vps_execute_command` para todos os comandos na VPS.
4. Arquivos de notas ficam em `$OBSIDIAN_VAULT_PATH/`. Subpastas são permitidas.
5. Nomes de arquivo: use kebab-case, sem acentos, extensão `.md`. Ex: `reuniao-sexta.md`.
6. Nunca delete notas sem confirmação explícita do usuário.

---

## 📥 Sincronizar (Pull)

Sempre execute antes de qualquer operação de leitura ou escrita:

```bash
cd /opt/obsidian-vault && git pull origin main
```

Branch padrão é `main`.

---

## 📝 Criar Nova Nota

### Fluxo:
1. Pull do repositório
2. Criar arquivo `.md` com frontmatter YAML + conteúdo
3. `git add`, `git commit`, `git push`

### Formato da nota:
```markdown
---
title: Título da Nota
date: 2026-03-19
tags: [tag1, tag2]
---

# Título da Nota

Conteúdo da nota aqui...
```

### Comandos:
```bash
cd /opt/obsidian-vault
git pull origin main

# Criar arquivo em GueClaw/ (substitua NOME e CONTEUDO)
cat > "GueClaw/NOME.md" << 'EOF'
---
title: Título
date: $(date +%Y-%m-%d)
tags: []
---

# Título

Conteúdo aqui.
EOF

git add "GueClaw/NOME.md"
git commit -m "feat: adicionar nota NOME"
git push origin main
```

---

## 🔍 Buscar Notas

### Por título (nome do arquivo):
```bash
cd /opt/obsidian-vault && find GueClaw -name "*.md" | grep -i "TERMO"
```

### Por conteúdo:
```bash
cd /opt/obsidian-vault && grep -r "TERMO" GueClaw --include="*.md" -l
```

### Com trecho do conteúdo:
```bash
cd /opt/obsidian-vault && grep -r "TERMO" GueClaw --include="*.md" -n
```

---

## 📋 Listar Todas as Notas

```bash
cd /opt/obsidian-vault && find GueClaw -name "*.md" ! -path "GueClaw/.obsidian/*" | sort | sed 's|GueClaw/||'
```

Para listar com data de modificação:
```bash
cd /opt/obsidian-vault && find GueClaw -name "*.md" ! -path "GueClaw/.obsidian/*" -printf "%T@ %f\n" | sort -rn | head -20 | awk '{print $2}'
```

---

## 📖 Ler Conteúdo de uma Nota

```bash
cat /opt/obsidian-vault/GueClaw/NOME.md
```

---

## ✏️ Atualizar Nota Existente

1. Pull (`cd /opt/obsidian-vault && git pull origin main`)
2. Ler conteúdo atual com `cat /opt/obsidian-vault/GueClaw/NOME.md`
3. Reescrever com novo conteúdo via `cat > /opt/obsidian-vault/GueClaw/NOME.md << 'EOF' ... EOF`
4. `git add GueClaw/NOME.md && git commit -m "update: atualizar nota NOME" && git push origin main`

Mensagem de commit: `"update: atualizar nota NOME"`

---

## 📂 Organização por Pastas

Sugestão de estrutura (respeite a estrutura que o usuário já criou):
```
/opt/obsidian-vault/
  ideias/
  reunioes/
  projetos/
  diario/
```

Para criar nota em subpasta:
```bash
mkdir -p /opt/obsidian-vault/GueClaw/PASTA
cat > /opt/obsidian-vault/GueClaw/PASTA/NOME.md << 'EOF'
...conteúdo...
EOF
git -C /opt/obsidian-vault add GueClaw/PASTA/NOME.md
git -C /opt/obsidian-vault commit -m "feat: adicionar nota PASTA/NOME"
git -C /opt/obsidian-vault push origin main
```

---

## ✅ Resposta ao Usuário

Após criar/atualizar nota, confirme:
- Nome do arquivo criado
- Pasta (se aplicável)
- Que foi sincronizado com GitHub (push feito)
- Que o Obsidian no Windows vai receber a nota automaticamente via Obsidian Git

Exemplo:
> ✅ Nota criada: `reunioes/revisao-projeto.md`
> Sincronizada com GitHub — aparecerá no seu Obsidian em breve.

---

## 🔧 Setup Inicial (primeira vez)

Se o vault não estiver clonado na VPS, execute:

```bash
git clone https://${OBSIDIAN_GITHUB_TOKEN}@github.com/Moisesjr20/meu-vault-obsidian.git /opt/obsidian-vault
cd /opt/obsidian-vault
git config user.email "gueclaw-agent@kyrius.info"
git config user.name "GueClaw Agent"
```

Verifique se já existe com:
```bash
ls /opt/obsidian-vault/GueClaw 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

Se o remote não tiver o token embutido (push falha com 403), atualize:
```bash
git -C /opt/obsidian-vault remote set-url origin https://${OBSIDIAN_GITHUB_TOKEN}@github.com/Moisesjr20/meu-vault-obsidian.git
```
