# Task: Create Grand Slam Offer

**Objetivo:** Criar uma oferta irresistível (Grand Slam Offer) usando framework Hormozi  
**Agente:** offer-architect  
**Resultado:** Offer Stack completo + Value Score >= 8.0

---

## 📋 Processo Step-by-Step

### **ETAPA 1: Discovery (Entender Cliente Profundamente)**

**Tempo:** 15-20 min  
**Objetivo:** Coletar informações críticas sobre cliente e oferta

**Perguntas obrigatórias:**

```yaml
# Produto/Serviço
produto_descricao: O que você está oferecendo?
custo_producao: Qual seu custo real para entregar?
prazo_entrega: Quanto tempo até entrega completa?

# Cliente
segmento: Quem é o cliente? (porte, setor, perfil)
dor_principal: Qual a MAIOR dor dele hoje? (específica)
desejo_profundo: O que ele REALMENTE quer alcançar?
objecoes_comuns: Por que ele ainda não comprou/resolveu? (3-5 objeções)

# Contexto
situacao_atual: Onde ele está hoje? (custo, tempo, dor)
custo_inacao: Quanto custa NÃO resolver? (R$/mês ou R$/ano)
situacao_desejada: Onde ele quer estar? (resultado específico)
valor_resultado: Quanto VALE esse resultado? (R$/mês ou R$/ano)

# Cases/Provas
casos_sucesso: Tem cases similares? (mínimo 2-3)
garantias: Pode oferecer garantia forte? (ROI, reembolso, etc)
```

**Exemplo preenchido (ERP):**

```yaml
produto_descricao: Sistema ERP completo (financeiro + estoque + vendas)
custo_producao: R$ 30.000 (desenvolvimento + implementação)
prazo_entrega: 60 dias (go-live completo)

segmento: Empresa média (50-100 funcionários, comércio/indústria)
dor_principal: 30h/mês desperdiçadas em processos manuais (planilhas)
desejo_profundo: Automatizar 100%, focar em crescimento (não operacional)
objecoes_comuns:
  - "É caro demais"
  - "E se não funcionar comigo?"
  - "Vai dar muito trabalho implementar"

situacao_atual: Processos manuais, erro humano, falta visibilidade
custo_inacao: R$ 9.000/mês (30h × R$ 300/h custo funcionário)
situacao_desejada: 100% automatizado, relatórios real-time
valor_resultado: Economizar R$ 9.000/mês = R$ 108.000/ano

casos_sucesso: 3 empresas similares (50-80 func) economizaram 25-35h/mês
garantias: Sim, podemos garantir economia de 30h/mês em 90 dias
```

---

### **ETAPA 2: Calcular Value Equation**

**Tempo:** 5 min  
**Objetivo:** Quantificar atratividade da oferta

**Fórmula:**

```
              (Dream Outcome × Perceived Likelihood)
VALUE = ──────────────────────────────────────────────
              (Time Delay × Effort & Sacrifice)

Score = (Dream × Likelihood) / (Time × Effort)
```

**Processo:**

1. **Dream Outcome (1-10):** Quão transformador é o resultado?
   ```
   Pergunte: "Esse resultado muda fundamentalmente a vida/negócio?"
   
   1-3: Melhoria pequena ("economizar 1h/semana")
   4-6: Melhoria significativa ("economizar 10h/semana")
   7-9: Transformação ("dobrar produtividade", "sair do prejuízo")
   10: Mudança de vida ("aposentar em 5 anos", "vender empresa por milhões")
   ```

2. **Perceived Likelihood (1-10):** Quão provável que VAI funcionar?
   ```
   Pergunte: "O cliente acredita que isso VAI funcionar?"
   
   1-3: "Talvez funcione" (sem provas, sem garantia)
   4-6: "Parece funcionar" (alguns depoimentos)
   7-9: "VAI funcionar" (vários cases + garantia forte)
   10: "Impossível falhar" (track record perfeito + garantia incondicional)
   ```

3. **Time Delay (1-10):** Quanto tempo até resultado?
   ```
   Pergunte: "Quanto tempo até o cliente VER o resultado?"
   
   1: Imediato (mesmo dia, 0-7 dias)
   2: Muito rápido (1-2 semanas)
   3: Rápido (3-4 semanas)
   5: Normal (1-2 meses)
   7: Longo (3-6 meses)
   10: Muito longo (1+ ano)
   ```

4. **Effort & Sacrifice (1-10):** Quanto esforço do cliente?
   ```
   Pergunte: "Quanto o cliente precisa fazer/abrir mão?"
   
   1: Zero esforço ("Done for you", cliente só aprova)
   2: Baixíssimo esforço (1-2 reuniões)
   3: Baixo esforço (participação mínima)
   5: Médio esforço (participação ativa, mas com suporte)
   7: Alto esforço (cliente faz metade do trabalho)
   10: Extremo esforço (cliente faz tudo sozinho)
   ```

**Exemplo (ERP):**

```yaml
dream_outcome: 9
  # Justificativa: Economizar R$ 9K/mês é transformador para empresa média
  
perceived_likelihood: 8
  # Justificativa: 3 cases similares + garantia de 30h/mês em 90 dias
  
time_delay: 3
  # Justificativa: 60 dias para go-live é rápido (ERPs demoram 6-12 meses)
  
effort: 2
  # Justificativa: Done for you, cliente só participa de 3 reuniões aprovação

# SCORE FINAL
score: 12.0
calculo: (9 × 8) / (3 × 2) = 72 / 6 = 12.0
status: ✅ EXCELENTE (>= 8.0 é bom, >= 10.0 é excepcional)
```

**Critério de aprovação:**
- **>= 8.0:** Oferta EXCELENTE, pode prosseguir
- **5.0-7.9:** Oferta BOA, melhorar algo (aumentar likelihood ou diminuir time/effort)
- **< 5.0:** Oferta FRACA, refazer (dream muito baixo ou time/effort muito altos)

---

### **ETAPA 3: Construir Core Product**

**Tempo:** 10 min  
**Objetivo:** Definir produto/serviço principal (base da oferta)

**Template:**

```markdown
### ✅ CORE: [Nome Descritivo do Produto] (Valor: R$ X.XXX)

[Descrição de 1 linha: O que é + benefício principal]

Inclui:
- [Feature 1] → [Benefit específico 1]
- [Feature 2] → [Benefit específico 2]
- [Feature 3] → [Benefit específico 3]
- [Feature 4] → [Benefit específico 4]

Prazo de entrega: [X semanas/meses]
```

**Regras:**

1. **Nome descritivo** (não genérico):
   - ❌ "ERP"
   - ✅ "Sistema ERP Completo (Financeiro + Estoque + Vendas)"

2. **Benefício claro** (não apenas feature):
   - ❌ "Possui módulo de estoque"
   - ✅ "Controle de estoque real-time → Zero rupturas"

3. **Valor justo** (baseado em custo + margem razoável):
   - Custo R$ 30K → Valor R$ 45K (margem 50% OK)
   - Custo R$ 30K → Valor R$ 150K (margem 400% NÃO CRÍVEL)

**Exemplo (ERP):**

```markdown
### ✅ CORE: Sistema ERP Completo (R$ 45.000)

Automatiza 100% do financeiro, estoque e vendas em 60 dias.

Inclui:
- Módulo Financeiro → Elimina 20h/mês de lançamentos manuais
- Módulo Estoque → Controle real-time, zero rupturas
- Módulo Vendas → Performance por vendedor, acompanhamento de metas
- Integração Nota Fiscal Eletrônica → Emissão automática

Prazo de entrega: 60 dias (go-live completo)
```

---

### **ETAPA 4: Criar Bônus de Alto Valor**

**Tempo:** 15-20 min  
**Objetivo:** Criar 2-3 bônus que aumentem valor percebido sem aumentar muito custo

**Critérios para cada bônus:**

1. **Alto valor PERCEBIDO** (o cliente vai valorizar muito)
2. **Baixo custo REAL** (você entrega por 20-50% do valor percebido)
3. **Complementa core** (amplifica resultado OU remove objeção)
4. **Não é obrigatório** (bônus, não parte essencial)

**Tipos de bônus eficazes:**

| Tipo | Exemplo | Custo Real | Valor Percebido | Ratio |
|------|---------|------------|-----------------|-------|
| Digital | Acesso vitalício + atualizações | R$ 0 | R$ 5.000 | ∞ |
| Suporte | 6 meses suporte premium | R$ 500/mês | R$ 12.000 | 4x |
| Training | Treinamento equipe | R$ 1.000 | R$ 8.000 | 8x |
| Tool adicional | Dashboard Power BI | R$ 2.000 | R$ 15.000 | 7.5x |
| Done for you | Migração de dados | R$ 3.000 | R$ 8.000 | 2.7x |
| Comunidade | Grupo VIP clientes | R$ 0 | R$ 3.000 | ∞ |

**Template bônus:**

```markdown
### ✅ BÔNUS #X: [Nome do Bônus] (Valor: R$ Y.YYY)

[Por que isso é valioso para o cliente]

[Detalhe específico do que inclui]

[Opcional: Objeção que remove]
```

**Processo para criar bônus:**

1. **Liste objeções comuns:**
   ```
   Objeção 1: "É caro demais"
   Objeção 2: "E se não funcionar comigo?"
   Objeção 3: "Vai dar muito trabalho implementar"
   Objeção 4: "E se minha equipe não souber usar?"
   ```

2. **Crie 1 bônus para cada objeção (top 2-3):**
   ```
   Objeção 2: "E se não funcionar comigo?"
   → Bônus: Garantia + Suporte Premium 6 meses
   
   Objeção 3: "Vai dar muito trabalho"
   → Bônus: Migração de Dados Done For You
   
   Objeção 4: "Equipe não vai saber usar"
   → Bônus: Treinamento Completo da Equipe
   ```

3. **Adicione 1 bônus "WOW" (não esperado):**
   ```
   Bônus WOW: Dashboard Executivo Power BI
   → Cliente não pediu, mas vai ADORAR
   ```

**Exemplo (ERP) - 3 bônus:**

```markdown
### ✅ BÔNUS #1: Dashboard Executivo Power BI (R$ 15.000)

Veja TODA a empresa em 1 tela: vendas, estoque, fluxo de caixa em tempo real.

Dashboards customizados para:
- Visão Geral (CEO)
- Financeiro (Controller)
- Vendas (Gerente Comercial)

Remove objeção: "E se eu não souber analisar os dados?"

---

### ✅ BÔNUS #2: Suporte Premium 6 Meses (R$ 12.000)

Atendimento prioritário via WhatsApp + ajustes ilimitados.

Inclui:
- Resposta em até 2h (horário comercial)
- Ajustes e melhorias ilimitadas
- Reuniões mensais de acompanhamento

Remove objeção: "E se precisar de ajuda depois?"

---

### ✅ BÔNUS #3: Migração de Dados Completa (R$ 8.000)

Transferimos TODO seu histórico para o novo sistema.

Migramos:
- Cadastro completo de clientes
- Histórico de vendas (últimos 2 anos)
- Estoque atual + movimentações
- Notas fiscais eletrônicas

Remove objeção: "Vai dar muito trabalho migrar"
```

---

### **ETAPA 5: Adicionar Scarcity + Urgency + Guarantee**

**Tempo:** 10 min  
**Objetivo:** Criar motivo para agir AGORA (não depois)

#### **5.1 - SCARCITY (Escassez)**

**Critério:** Deve ser **REAL** (não fake)

**Opções:**

```markdown
# Opção 1: Capacidade limitada (mais comum)
"Apenas X vagas este mês/trimestre"
Justificativa: Nossa equipe só consegue implementar X projetos simultâneos

# Opção 2: Tempo limitado (se tiver deadline)
"Promoção válida até DD/MM/AAAA"
Justificativa: Fim de trimestre, planejamento, etc

# Opção 3: Estoque limitado (se produto físico)
"Apenas X unidades disponíveis"
```

**Exemplo (ERP):**
```markdown
🚨 **ATENÇÃO:** Apenas 2 vagas restantes este trimestre (de 5 disponíveis)

Nossa equipe de implementação só consegue atender 5 clientes por trimestre 
para garantir qualidade. Já preenchemos 3 vagas.
```

#### **5.2 - URGENCY (Urgência)**

**Por que agir AGORA?**

**Opções (combine 2-3):**

```markdown
# Opção 1: Preço sobe
"Investimento passa de R$ X para R$ Y em Z dias"

# Opção 2: Bônus expira
"Bônus [Nome] (R$ X.XXX) só incluso até DD/MM"

# Opção 3: Custo de inação
"Cada mês atrasado = R$ X.XXX desperdiçados"

# Opção 4: Oportunidade de mercado
"Concorrentes já estão se automatizando"
```

**Exemplo (ERP):**
```markdown
### ⚡ POR QUE AGORA?

1. **Preço sobe:** Investimento passa de R$ 45K para R$ 55K em 15 dias
2. **Custo de inação:** Cada mês sem ERP = R$ 9.000 desperdiçados
3. **Janela limitada:** Apenas 2 vagas este trimestre
```

#### **5.3 - GUARANTEE (Garantia)**

**Objetivo:** Reverter TODO o risco para você

**Opções (escolha 1):**

```markdown
# Opção 1: Reembolso incondicional (mais simples)
"30 dias de garantia. Não gostou? Devolvo 100% sem perguntas."

# Opção 2: Resultado garantido (mais forte)
"Se você não conseguir [resultado específico] em [prazo], 
devolvo 100% + R$ X.XXX de desculpa"

# Opção 3: Refazemos grátis (se serviço)
"Se não atingir [resultado], refazemos TODO o projeto GRÁTIS"

# Opção 4: Overdelivery (mais agressiva)
"Garantimos [resultado X], mas entregaremos [resultado 2X] ou reembolso + bônus"
```

**Exemplo (ERP):**
```markdown
### 🛡️ GARANTIA ANTI-RISCO

Se você não economizar pelo menos R$ 9.000/mês em 90 dias após go-live, 
refazemos TODO o projeto GRÁTIS + R$ 5.000 de desculpa pelo incômodo.

Você não arrisca NADA. Eu assumo todo o risco.
```

---

### **ETAPA 6: Montar Offer Stack Final**

**Tempo:** 5 min  
**Objetivo:** Juntar tudo em formato visual impactante

**Template final:**

```markdown
## 💎 O QUE VOCÊ RECEBE

### ✅ CORE: [Nome] (R$ X.XXX)
[Descrição + inclui]

### ✅ BÔNUS #1: [Nome] (R$ Y.YYY)
[Descrição]

### ✅ BÔNUS #2: [Nome] (R$ Z.ZZZ)
[Descrição]

### ✅ BÔNUS #3: [Nome] (R$ W.WWW)
[Descrição]

---

### 🔥 VALOR TOTAL: R$ [X+Y+Z+W].XXX
### 💰 SEU INVESTIMENTO HOJE: R$ X.XXX ([XX]% desconto)

---

### ⚡ POR QUE AGORA?

1. [Urgência 1]
2. [Urgência 2]
3. [Scarcity]

---

### 🛡️ GARANTIA ANTI-RISCO

[Texto da garantia]

---

### ✅ PRÓXIMO PASSO

[Call-to-Action claro]
```

**Exemplo completo final (ERP):**

<details>
<summary>📄 Ver offer stack completo</summary>

```markdown
## 💎 O QUE VOCÊ RECEBE

### ✅ CORE: Sistema ERP Completo (R$ 45.000)
Automatiza 100% do financeiro, estoque e vendas.

Inclui:
- Módulo Financeiro → Elimina 20h/mês de lançamentos manuais
- Módulo Estoque → Controle real-time, zero rupturas
- Módulo Vendas → Performance por vendedor, metas automáticas
- Integração Nota Fiscal Eletrônica

Prazo: 60 dias (go-live completo)

### ✅ BÔNUS #1: Dashboard Executivo Power BI (R$ 15.000)
Veja TODA a empresa em 1 tela.

Vendas, estoque, fluxo de caixa em tempo real. Dashboards customizados para CEO, Controller e Gerente Comercial.

### ✅ BÔNUS #2: Suporte Premium 6 Meses (R$ 12.000)
Atendimento prioritário via WhatsApp + ajustes ilimitados.

Resposta em 2h, melhorias ilimitadas, reuniões mensais de acompanhamento.

### ✅ BÔNUS #3: Migração de Dados Completa (R$ 8.000)
Transferimos TODO seu histórico (clientes, vendas, NFs).

Você NÃO perde nada. Done for you.

---

### 🔥 VALOR TOTAL: R$ 80.000
### 💰 SEU INVESTIMENTO HOJE: R$ 45.000 (44% desconto)

---

### ⚡ POR QUE AGORA?

1. Preço sobe para R$ 55.000 em 15 dias
2. Cada mês atrasado = R$ 9.000 desperdiçados
3. Apenas 2 vagas restantes este trimestre (de 5 disponíveis)

---

### 🛡️ GARANTIA ANTI-RISCO

Se você não economizar pelo menos R$ 9.000/mês em 90 dias, 
refazemos TODO o projeto GRÁTIS + R$ 5.000 de desculpa.

Você não arrisca NADA. Eu assumo todo o risco.

---

### ✅ PRÓXIMO PASSO

[Garantir Minha Vaga Agora] ← Últimos dias com 44% OFF
```

</details>

---

### **ETAPA 7: Validação Final**

**Tempo:** 5 min  
**Objetivo:** Garantir que offer está "irresistível"

**Checklist de qualidade:**

```yaml
value_equation:
  - [ ] Score >= 8.0 (preferível >= 10.0)
  - [ ] Dream Outcome específico e mensurável
  - [ ] Perceived Likelihood alta (cases + garantia)
  - [ ] Time Delay baixo (quanto mais rápido, melhor)
  - [ ] Effort baixo (done for you > DIY)

offer_stack:
  - [ ] Core bem definido (features → benefits)
  - [ ] Mínimo 2 bônus (idealmente 3)
  - [ ] Cada bônus: valor percebido >= 2x custo real
  - [ ] Valor Total = 1.5-3x Investimento

scarcity_urgency_guarantee:
  - [ ] Scarcity REAL (não fake)
  - [ ] Urgency clara (por que agora, não depois)
  - [ ] Guarantee forte (reverse risk)

clareza:
  - [ ] Cliente entende exatamente o que recebe
  - [ ] Números específicos (não "muito", "bastante")
  - [ ] Benefícios claros (não apenas features técnicas)
```

**Se TODOS os itens = ✅ → APROVADO**

**Se algum item = ❌ → REFAZER etapa correspondente**

---

## 📊 Métricas de Sucesso

**Offer criada com este processo deve ter:**

- **Value Score:** >= 8.0 (preferível >= 10.0)
- **Taxa de conversão esperada:** 40-60% (vs 15-20% sem framework)
- **Ticket Médio:** 1.5-3x o investimento base
- **Churn Rate:** < 10% (garantia forte = clientes qualificados)

---

## 🎯 Output Final

Ao concluir esta task, você entrega:

1. **Offer Stack completo em Markdown** (pronto para copiar/colar)
2. **Value Score calculado** (com justificativas)
3. **Checklist de validação preenchida**

**Arquivo de saída:** `offer-stack-[cliente]-[data].md`

---

**Tempo total estimado:** 60-75 minutos  
**Agente responsável:** offer-architect  
**Framework:** $100M Offers (Alex Hormozi)
