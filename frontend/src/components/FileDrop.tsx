import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export function FileDrop({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) pick(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Enviar planilha .xlsx"
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click(); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-6)',
        margin: 'var(--space-6)',
        border: `2px dashed ${over ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)'}`,
        borderRadius: 'var(--radius-2xl)',
        background: over ? 'var(--color-ai-surface)' : 'var(--color-neutral-50)',
        color: 'var(--color-neutral-600)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e: ChangeEvent<HTMLInputElement>) => pick(e.target.files)}
        style={{ display: 'none' }}
      />
      <span style={{ color: 'var(--color-brand-gold)' }}><UploadIcon /></span>
      <div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-charcoal)' }}>
          Arraste a Matriz Fiscal (.xlsx) aqui
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
          ou clique para selecionar · a análise roda <strong>no seu navegador</strong>, o arquivo não é enviado a nenhum servidor
        </p>
      </div>
    </div>
  );
}
