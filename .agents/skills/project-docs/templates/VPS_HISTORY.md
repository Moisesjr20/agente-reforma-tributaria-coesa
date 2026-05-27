# Histórico de Operações na VPS

Registro de todas as operações realizadas na VPS: deploys, configurações, correções e incidentes.

> **Formato de entrada:** Execute `logvps "descrição"` ou adicione manualmente seguindo o template abaixo.
>
> **Alias para adicionar ao `.bashrc` da VPS:**
> ```bash
> logvps() {
>   FILE="/opt/gueclaw-agent/docs/operations/vps-history.md"
>   echo -e "\n## [$(date '+%Y-%m-%d %H:%M')] — Manual\n**Operador:** $(whoami)\n**Ação:** $1\n" >> $FILE
> }
> ```

---

<!-- Entradas mais recentes no topo -->

## [YYYY-MM-DD HH:MM] — [Tipo: Deploy | Fix | Config | Incident | Manual]

**Operador:** [nome ou "GueClaw Agent"]
**Motivação:** [por que foi feito]

### Ações executadas
```bash
# Comandos rodados na VPS
```

### Resultado
[O que mudou, qual foi o impacto observado]

### Rollback
```bash
# Como desfazer se necessário
```

---

<!-- Adicione novas entradas ACIMA desta linha, mais recente primeiro -->
