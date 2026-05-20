export function TypingIndicator() {
  const dotStyle = (delay: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-brand-gold)',
    animation: 'bounce-dot 1.2s infinite',
    animationDelay: delay,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        animation: 'fade-in-up 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--color-ai-surface)',
          border: '1px solid var(--color-neutral-200)',
          borderRadius: '0 var(--radius-2xl) var(--radius-2xl) var(--radius-2xl)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          minHeight: '44px',
        }}
      >
        <span style={dotStyle('0ms')} />
        <span style={dotStyle('150ms')} />
        <span style={dotStyle('300ms')} />
      </div>
    </div>
  );
}
