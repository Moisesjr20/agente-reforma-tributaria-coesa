---
name: rag-curriculos
framework: doe
description: Esta skill processa uma pasta de currículos (PDF, DOCX), extrai os textos localmente e você faz a comparação deles com o perfil de uma vaga de emprego e retorna um ranking estruturado em Markdown com os candidatos mais bem alinhados. Use esta skill quando o usuário pedir para avaliar, ranquear, comparar ou fazer RAG em currículos para uma vaga.
---

# RAG de Currículos e Avaliação de Perfil

> **Operação DOE** — Esta skill segue a arquitetura DOE. Toda nova skill criada DEVE incluir `framework: doe` no frontmatter e o bloco de Operação DOE no início do corpo. Toda execução segue: **Análise → Plano → Aprovação → Execução → Review**.

Esta skill permite a você (Orquestrador) automatizar a leitura de múltiplos currículos (PDFs e DOCs) em um diretório e compará-los com uma descrição de vaga (job description) fornecida, pontuando os candidatos de 0 a 100 de acordo com a aderência ao perfil solicitado, de forma totalmente autônoma e sem necessidade da API do Gemini. 

## 1. LAYER 1: DIRECTIVE (O Que Fazer)
Seu objetivo é extrair os currículos (via script nativo), lê-los usando **seu próprio contexto de inteligência artificial**, avaliá-los frente à vaga e retornar ao usuário **uma lista em formato Markdown**, ordenada do melhor perfil (maior score) para o perfil menos alinhado (menor score). 
A lista **DEVE** conter os seguintes dados para cada candidato:
- Nome completo
- Nome do arquivo do documento original (com extensão)
- Localidade (cidade/estado onde o candidato reside)
- Telefone de contato

## 2. LAYER 2: ORCHESTRATION (Como Você Atua)
Como a extração de PDFs é mecânica, você delegará o processo de parsing para o script Python na **Camada 3**. Depois, receberá o texto limpo e fará todo o raciocínio semântico (RAG).

**Passos orquestrados:**
1. Confirme com o usuário o diretório dos currículos (Padrão: `c:\Users\kyriu\Downloads\vaga\curriculos`) e o arquivo da vaga (Padrão: `c:\Users\kyriu\Downloads\vaga\descrição vaga.txt`).
2. Acione o script Python via linha de comando (`run_command`) para criar o JSON de extração, conforme o comando abaixo da camada 3.
3. Leia o arquivo `extracted_resumes.json` criado e o leia-o junto com a Job Description (`descrição vaga.txt`).
4. **VOCÊ MESMO COMO LLM** fará a avaliação de todos os currículos lidos contidos no JSON frente à descrição da vaga. Identifique as habilidades requeridas e extraia Nome, Contato, Localidade e estipule um SCORE de 0 a 100.
5. Formate os dados de sua análise numa resposta Markdown visualmente rica para o usuário, ordenando strictamente do maior para o menor Score calculado.

### Estrutura do Markdown Esperada no Final:
```markdown
# 🏆 Ranking de Currículos para a Vaga

Aqui está o resultado da análise dos currículos, do mais alinhado ao menos alinhado.

| # | Nome do Candidato | Localidade | Telefone | Arquivo | Score |
|---|-------------------|------------|----------|---------|-------|
| 1 | Nome Exemplo      | São Paulo  | 119999...| cv.pdf  | 95/100|
...
```

## 3. LAYER 3: EXECUTION (O Script Extrator)

**Execute o seguinte comando apenas para extrair e agrupar o texto dos arquivos:**

```bash
python "c:\Users\kyriu\Downloads\vaga\meu-vault-obsidian\GueClaw\skills\myskills\rag-curriculos\execution\evaluate_resumes.py" --cv-dir "c:\Users\kyriu\Downloads\vaga\curriculos" --output "c:\Users\kyriu\Downloads\vaga\extracted_resumes.json"
```

Aguarde o processamento mecânico de parsing, depois proceda para a etapa 3 da orquestração com uma ferramenta de leitura de arquivos (como `view_file` ou equivalente).
