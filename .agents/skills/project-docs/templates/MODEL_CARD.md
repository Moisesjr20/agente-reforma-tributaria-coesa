---
agent: nome-do-agente
version: 1.0.0
model_backend: claude-3-5-sonnet
last_updated: YYYY-MM-DD
---

# Model Card: [Nome do Agente]

## Descrição
O que este agente faz em uma frase objetiva.

## Capacidades
- Listar o que o agente PODE fazer
- Com quais APIs/serviços ele interage
- Quais skills ele invoca

## Limitações
- O que o agente NÃO faz ou NÃO deve fazer
- Casos de borda conhecidos onde falha ou produz resultado ruim

## Dependências

| Dependência | Tipo | Obrigatória? | Fallback |
|---|---|---|---|
| OpenAI / Anthropic API | LLM | Sim | — |
| [API externa] | Integração | Não | Mensagem de erro amigável |

## Restrições Éticas
- Não acessar dados de terceiros sem consentimento explícito
- Não executar ações irreversíveis (delete, send, publish) sem confirmação do usuário
- Não armazenar credenciais em memória conversacional

## Chain of Thought Esperado

Para a tarefa principal deste agente:

1. **Entender** — Qual é a intenção real? (não apenas o que foi dito)
2. **Verificar** — Tenho todos os dados necessários?
3. **Planejar** — Qual sequência de ações resolve o problema?
4. **Executar** — Realizar as ações na ordem planejada
5. **Confirmar** — O resultado atende à intenção original?

## Métricas de Performance

- Taxa de acerto na tarefa principal: —%
- Tempo médio de resposta: —s
- Última avaliação: YYYY-MM-DD

## Histórico de Versões

| Versão | Data | Mudança | Impacto |
|---|---|---|---|
| 1.0.0 | YYYY-MM-DD | Versão inicial | — |
