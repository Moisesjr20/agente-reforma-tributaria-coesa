import type { AuditResult } from '../audit/runAudit';
import { RULE_DESC, RULE_ORDER } from '../audit/runAudit';

interface Props {
  result: AuditResult;
  source: string;
}

function Card({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      style={{
        flex: '1 1 120px',
        minWidth: '120px',
        background: 'var(--color-white)',
        border: '1px solid var(--color-neutral-200)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

export function AuditSummary({ result, source }: Props) {
  return (
    <section style={{ padding: '0 var(--space-6)' }}>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', marginBottom: 'var(--space-3)' }}>
        {source} · tabela oficial <code>{result.tableVersion}</code>
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Card label="Itens analisados" value={result.count} color="var(--color-brand-charcoal)" />
        <Card label="Com apontamento" value={result.itemsComProblema} color="var(--color-brand-charcoal)" />
        <Card label="Erros" value={result.bySeverity.ERRO} color="var(--color-error)" />
        <Card label="Alertas" value={result.bySeverity.ALERTA} color="var(--color-warning)" />
        <Card label="Atenção (info)" value={result.bySeverity.INFO} color="var(--color-info)" />
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-charcoal)', marginBottom: 'var(--space-3)' }}>
        Apontamentos por regra
      </h3>
      <div style={{ overflowX: 'auto', marginBottom: 'var(--space-6)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--color-neutral-600)' }}>
              <th style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-200)' }}>Regra</th>
              <th style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-200)' }}>Descrição</th>
              <th style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-200)', textAlign: 'right' }}>Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            {RULE_ORDER.map((r) => (
              <tr key={r}>
                <td style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-100)', fontFamily: 'var(--font-mono)' }}>{r}</td>
                <td style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-100)' }}>{RULE_DESC[r]}</td>
                <td style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-100)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{result.byRule[r] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
