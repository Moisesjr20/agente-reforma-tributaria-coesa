import { useState } from 'react';
import { FileDrop } from './FileDrop';
import { AuditSummary } from './AuditSummary';
import { FindingsTable } from './FindingsTable';
import { parseMatrixWorkbook, MatrixParseError } from '../audit/parseXlsx';
import { loadOfficialContext } from '../audit/officialTables';
import { runAudit, type AuditResult } from '../audit/runAudit';

type State =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'done'; result: AuditResult; source: string }
  | { kind: 'error'; message: string };

export function AuditView() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const handleFile = async (file: File) => {
    setState({ kind: 'parsing' });
    try {
      const [buf, ctx] = await Promise.all([file.arrayBuffer(), loadOfficialContext()]);
      const parsed = parseMatrixWorkbook(buf);
      const result = runAudit(parsed.items, ctx);
      setState({ kind: 'done', result, source: file.name });
    } catch (err) {
      const message = err instanceof MatrixParseError
        ? err.message
        : `Não foi possível analisar a planilha: ${(err as Error).message}`;
      setState({ kind: 'error', message });
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-neutral-50)' }}>
      {state.kind === 'idle' && <FileDrop onFile={handleFile} />}

      {state.kind === 'parsing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-16)', color: 'var(--color-neutral-600)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-neutral-200)', borderTopColor: 'var(--color-brand-gold)', borderRadius: 'var(--radius-full)', animation: 'coesa-spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 'var(--font-size-sm)' }}>Analisando a planilha no seu navegador...</p>
          <style>{`@keyframes coesa-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state.kind === 'error' && (
        <div style={{ margin: 'var(--space-6)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}>
          <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>Não foi possível auditar</p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>{state.message}</p>
          <button
            onClick={() => setState({ kind: 'idle' })}
            style={{ marginTop: 'var(--space-4)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)', background: 'var(--color-white)', color: 'var(--color-brand-charcoal)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
          >
            Tentar outra planilha
          </button>
        </div>
      )}

      {state.kind === 'done' && (
        <div style={{ paddingTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 var(--space-6) var(--space-3)' }}>
            <button
              onClick={() => setState({ kind: 'idle' })}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)', background: 'var(--color-white)', color: 'var(--color-brand-charcoal)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
            >
              Nova análise
            </button>
          </div>
          <AuditSummary result={state.result} source={state.source} />
          <FindingsTable result={state.result} />
        </div>
      )}
    </div>
  );
}
