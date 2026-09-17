import { useMemo, useState } from 'react';
import type { AuditResult, FindingRow } from '../audit/runAudit';
import { RULE_ORDER, findingsToCsv } from '../audit/runAudit';
import type { Severity } from '../audit/rules';

interface Props {
  result: AuditResult;
}

const SEV_STYLE: Record<Severity, { fg: string; bg: string }> = {
  ERRO: { fg: 'var(--color-error)', bg: 'var(--color-error-bg)' },
  ALERTA: { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  INFO: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)' },
};

const ALL_SEV: Severity[] = ['ERRO', 'ALERTA', 'INFO'];
const MAX_RENDER = 300;

function SevBadge({ s }: { s: Severity }) {
  const st = SEV_STYLE[s];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: st.fg, background: st.bg }}>
      {s}
    </span>
  );
}

export function FindingsTable({ result }: Props) {
  // Por padrão foca em ERRO + ALERTA (esconde os INFO de Imposto Seletivo).
  const [sevs, setSevs] = useState<Set<Severity>>(new Set(['ERRO', 'ALERTA']));
  const [regra, setRegra] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  const filtered = useMemo<FindingRow[]>(() => {
    const q = busca.trim().toLowerCase();
    return result.rows.filter((r) =>
      sevs.has(r.severidade) &&
      (regra === 'todas' || r.regra === regra) &&
      (q === '' || r.item.toLowerCase().includes(q) || r.diagnostico.toLowerCase().includes(q)),
    );
  }, [result.rows, sevs, regra, busca]);

  const toggleSev = (s: Severity) => {
    setSevs((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const exportCsv = () => {
    const blob = new Blob(['﻿' + findingsToCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'divergencias-auditoria.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const th: React.CSSProperties = { padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-200)', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--color-white)' };
  const td: React.CSSProperties = { padding: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-100)', verticalAlign: 'top' };

  return (
    <section style={{ padding: '0 var(--space-6) var(--space-6)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {ALL_SEV.map((s) => (
            <button
              key={s}
              onClick={() => toggleSev(s)}
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer',
                border: `1px solid ${sevs.has(s) ? SEV_STYLE[s].fg : 'var(--color-neutral-200)'}`,
                color: sevs.has(s) ? SEV_STYLE[s].fg : 'var(--color-neutral-400)',
                background: sevs.has(s) ? SEV_STYLE[s].bg : 'var(--color-white)',
              }}
            >
              {s} ({result.bySeverity[s]})
            </button>
          ))}
        </div>

        <select
          value={regra}
          onChange={(e) => setRegra(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-ui)' }}
        >
          <option value="todas">Todas as regras</option>
          {RULE_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar item ou diagnóstico..."
          style={{ flex: '1 1 200px', minWidth: '160px', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-ui)', outline: 'none' }}
        />

        <button
          onClick={exportCsv}
          disabled={!filtered.length}
          style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: filtered.length ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)', color: filtered.length ? '#1A1A1A' : 'var(--color-neutral-400)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', cursor: filtered.length ? 'pointer' : 'not-allowed' }}
        >
          Exportar CSV ({filtered.length})
        </button>
      </div>

      <div style={{ maxHeight: '52vh', overflow: 'auto', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
          <thead>
            <tr style={{ color: 'var(--color-neutral-600)' }}>
              <th style={{ ...th, width: '64px' }}>Linha</th>
              <th style={th}>Item</th>
              <th style={{ ...th, width: '64px' }}>Regra</th>
              <th style={{ ...th, width: '84px' }}>Sev.</th>
              <th style={th}>Diagnóstico</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, MAX_RENDER).map((r, i) => (
              <tr key={`${r.linha}-${r.regra}-${i}`}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'var(--color-neutral-600)' }}>{r.linha}</td>
                <td style={{ ...td, color: 'var(--color-brand-charcoal)' }}>{r.item || <em style={{ color: 'var(--color-neutral-400)' }}>(sem descrição)</em>}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{r.regra}</td>
                <td style={td}><SevBadge s={r.severidade} /></td>
                <td style={{ ...td, color: 'var(--color-neutral-700)' }}>{r.diagnostico}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-neutral-400)', fontSize: 'var(--font-size-sm)' }}>
            Nenhum apontamento com os filtros atuais.
          </p>
        )}
        {filtered.length > MAX_RENDER && (
          <p style={{ textAlign: 'center', padding: 'var(--space-3)', color: 'var(--color-neutral-400)', fontSize: 'var(--font-size-xs)' }}>
            Exibindo {MAX_RENDER} de {filtered.length} — refine os filtros ou exporte o CSV para a lista completa.
          </p>
        )}
      </div>
    </section>
  );
}
