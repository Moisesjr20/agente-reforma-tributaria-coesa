# Prompt Registry

Registro de todos os prompts do sistema. Cada prompt é versionado e auditável.

---

## Como usar este arquivo

- **Ao criar um novo prompt:** adicione uma seção com o próximo ID
- **Ao modificar:** incremente a versão e adicione entrada no histórico de mudanças
- **Versionamento semântico:**
  - MAJOR → Mudança que altera comportamento observável
  - MINOR → Adição de exemplos, melhoria de precisão
  - PATCH → Correção de typo, formatação

---

## PROMPT-001 — [Nome do Prompt]

- **Versão:** 1.0.0
- **Data:** YYYY-MM-DD
- **Intenção:** Descreva o objetivo do prompt em uma frase
- **Usado em:** [skill ou componente que usa este prompt]

### Template
```
[Cole aqui o prompt completo]

Variáveis: {{variavel1}}, {{variavel2}}
```

### Few-Shot Examples

| Input | Output esperado |
|---|---|
| Exemplo 1 | Resultado 1 |
| Exemplo 2 | Resultado 2 |

### Histórico de Mudanças

| Versão | Data | Mudança | Impacto |
|---|---|---|---|
| 1.0.0 | YYYY-MM-DD | Versão inicial | — |

---

<!-- Adicione novos prompts acima desta linha -->
