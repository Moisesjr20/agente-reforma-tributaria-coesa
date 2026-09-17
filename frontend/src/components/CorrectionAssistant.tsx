import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type * as XLSX from 'xlsx';
import type { AuditContext, MatrixItem } from '../audit/rules';
import { deriveCorrections, type Correction } from '../audit/corrections';
import { downloadCorrectedXlsx } from '../audit/exportXlsx';
import { askReforma } from '../services/reforma.service';

interface Props {
  items: MatrixItem[];
  ctx: AuditContext;
  wb: XLSX.WorkBook;
  columns: string[];
  source: string;
}

interface Row extends Correction {
  accepted: boolean;
  ia?: { loading: boolean; text?: string; error?: string };
}

interface ChatMsg { role: 'user' | 'ia'; content: string }

export function CorrectionAssistant({ items, ctx, wb, columns, source }: Props) {
  const base = useMemo(() => deriveCorrections(items, ctx), [items, ctx]);
  const [rows, setRows] = useState<Row[]>(() =>
    base.map((c) => ({ ...c, accepted: c.kind === 'deterministico' && !!c.para })),
  );
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const detCount = rows.filter((r) => r.kind === 'deterministico').length;
  const decCount = rows.filter((r) => r.kind === 'requer-decisao').length;
  const acceptedCount = rows.filter((r) => r.accepted && r.para).length;

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const consultarIA = async (r: Row) => {
    update(r.id, { ia: { loading: true } });
    const item = items.find((i) => i.__row === r.linha);
    const cat = String(item?.['Categoria'] ?? '');
    const ncm = String(item?.['NCM (atual)'] ?? '');
    const q = `Auditoria fiscal (Reforma Tributária) — item "${r.itemDesc}", categoria ${cat}, NCM atual ${ncm || '(ausente)'}. Regra ${r.regra}: ${r.motivo} Sob a LC 214/2025, qual o NCM correto e o cClassTrib/CST de saída adequados? Responda de forma objetiva, citando o dispositivo legal.`.slice(0, 1000);
    try {
      const data = await askReforma(q);
      update(r.id, { ia: { loading: false, text: data.answer } });
    } catch {
      update(r.id, { ia: { loading: false, error: 'Não foi possível consultar a IA agora.' } });
    }
  };

  const exportar = () => {
    const accepted = rows.filter((r) => r.accepted && r.para);
    const res = downloadCorrectedXlsx(wb, columns, accepted, source);
    setExported(`${res.applied} correção(ões) aplicadas — ${res.filename} baixado.`);
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (q.length < 10 || chatLoading) return;
    setChat((p) => [...p, { role: 'user', content: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const data = await askReforma(q);
      setChat((p) => [...p, { role: 'ia', content: data.answer }]);
    } catch {
      setChat((p) => [...p, { role: 'ia', content: 'Não foi possível conectar ao servidor.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)',
    fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-ui)', outline: 'none',
  };

  return (
    <section style={{ padding: 'var(--space-6)', borderTop: '1px solid var(--color-neutral-200)', marginTop: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-charcoal)' }}>
        Assistente de correção
      </h3>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginTop: 'var(--space-1)' }}>
        {detCount} correção(ões) automática(s) e {decCount} que precisam da sua decisão. As correções rodam no navegador;
        “Consultar IA” envia <strong>apenas o item selecionado</strong> ao agente da COESA.
      </p>

      <div style={{ maxHeight: '46vh', overflow: 'auto', marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: 'var(--color-white)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <input
                type="checkbox"
                checked={r.accepted}
                disabled={!r.para}
                onChange={(e) => update(r.id, { accepted: e.target.checked })}
                style={{ marginTop: '3px', accentColor: 'var(--color-brand-gold)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-brand-charcoal)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-neutral-400)' }}>L{r.linha}</span>{' '}
                  <strong>{r.itemDesc || '(sem descrição)'}</strong>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-info)' }}>{r.regra}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>{r.campo}:</span>
                  <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', textDecoration: 'line-through' }}>{r.de || '(vazio)'}</code>
                  <span style={{ color: 'var(--color-neutral-400)' }}>→</span>
                  <input
                    value={r.para}
                    placeholder={r.kind === 'requer-decisao' ? 'defina o valor…' : ''}
                    onChange={(e) => update(r.id, { para: e.target.value, accepted: !!e.target.value && r.accepted })}
                    style={{ ...inputStyle, minWidth: '120px', borderColor: r.para ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)' }}
                  />
                  {r.kind === 'requer-decisao' && (
                    <button
                      onClick={() => consultarIA(r)}
                      disabled={r.ia?.loading}
                      style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-info)', background: 'var(--color-info-bg)', color: 'var(--color-info)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}
                    >
                      {r.ia?.loading ? 'Consultando…' : 'Consultar IA'}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', marginTop: 'var(--space-2)' }}>{r.motivo}</p>
                {r.ia?.text && (
                  <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-ai-surface)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                    <ReactMarkdown>{r.ia.text}</ReactMarkdown>
                  </div>
                )}
                {r.ia?.error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>{r.ia.error}</p>}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--font-size-sm)' }}>Nenhuma correção proposta — a matriz não tem apontamentos corrigíveis.</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <button
          onClick={exportar}
          disabled={!acceptedCount}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: acceptedCount ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)', color: acceptedCount ? '#1A1A1A' : 'var(--color-neutral-400)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', cursor: acceptedCount ? 'pointer' : 'not-allowed', boxShadow: acceptedCount ? 'var(--shadow-gold)' : 'none' }}
        >
          Exportar planilha corrigida ({acceptedCount})
        </button>
        {exported && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>{exported}</span>}
      </div>

      {/* Chat livre com a IA sobre a auditoria */}
      <div style={{ marginTop: 'var(--space-6)', borderTop: '1px dashed var(--color-neutral-200)', paddingTop: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-charcoal)', marginBottom: 'var(--space-2)' }}>
          Pergunte à IA sobre a reforma / esta auditoria
        </p>
        {chat.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', maxHeight: '30vh', overflow: 'auto' }}>
            {chat.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-lg)', background: m.role === 'user' ? 'var(--color-brand-gold-muted)' : 'var(--color-neutral-100)', fontSize: 'var(--font-size-sm)' }}>
                {m.role === 'ia' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
              </div>
            ))}
            {chatLoading && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>IA digitando…</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
            placeholder="Ex.: qual NCM correto para o vinho ABEL PINCHARD?"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={sendChat}
            disabled={chatInput.trim().length < 10 || chatLoading}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: chatInput.trim().length >= 10 && !chatLoading ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)', color: chatInput.trim().length >= 10 && !chatLoading ? '#1A1A1A' : 'var(--color-neutral-400)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer' }}
          >
            Enviar
          </button>
        </div>
      </div>
    </section>
  );
}
