import type { Source } from '../types';

interface Props {
  sources: Source[];
}

export function SourceCitations({ sources }: Props) {
  if (sources.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 'var(--space-3)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
      }}
    >
      <span
        style={{
          width: '100%',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-neutral-600)',
          marginBottom: 'var(--space-1)',
        }}
      >
        Fontes consultadas:
      </span>
      {sources.map((s) => (
        <span
          key={s.slug}
          title={s.title}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: '2px var(--space-2)',
            background: 'var(--color-brand-gold-muted)',
            color: 'var(--color-brand-gold-dark)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 'var(--font-weight-medium)',
            border: '1px solid rgba(201,162,39,0.20)',
          }}
        >
          {s.slug}
          <span style={{ opacity: 0.7 }}>
            {Math.round(s.similarity * 100)}%
          </span>
        </span>
      ))}
    </div>
  );
}
