export function ChatHeader() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-neutral-200)',
        boxShadow: 'var(--shadow-xs)',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <img
        src="/LOGOTIPO-COESA-08.png"
        alt="COESA Contabilidade"
        style={{ height: '36px', objectFit: 'contain' }}
      />
      <div style={{ borderLeft: '1px solid var(--color-neutral-200)', paddingLeft: 'var(--space-4)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-brand-charcoal)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Assistente Reforma Tributária
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-neutral-600)',
            marginTop: '2px',
          }}
        >
          LCP 214 · IBS · CBS · Split Payment
        </p>
      </div>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-neutral-600)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-success)',
            display: 'inline-block',
          }}
        />
        Online
      </div>
    </header>
  );
}
