import { useState, useRef, type KeyboardEvent, type FormEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
}

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function ChatInput({ onSend, isLoading }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = text.trim().length > 0 && !isLoading;

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-neutral-200)',
        background: 'var(--color-white)',
        padding: 'var(--space-4) var(--space-6)',
        flexShrink: 0,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-3)',
          background: 'var(--color-neutral-50)',
          border: `1.5px solid ${canSend ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-4)',
          transition: 'border-color 0.15s ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Faça sua pergunta sobre a Reforma Tributária..."
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1,
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--font-size-base)',
            lineHeight: 'var(--leading-relaxed)',
            color: 'var(--color-brand-charcoal)',
            minHeight: '28px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        />

        <button
          type="submit"
          disabled={!canSend}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            background: canSend ? 'var(--color-brand-gold)' : 'var(--color-neutral-200)',
            color: canSend ? '#1A1A1A' : 'var(--color-neutral-400)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
            boxShadow: canSend ? 'var(--shadow-gold)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (canSend) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = '';
          }}
          onMouseDown={(e) => {
            if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
          }}
        >
          <SendIcon />
        </button>
      </form>

      <p
        style={{
          textAlign: 'center',
          marginTop: 'var(--space-2)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-neutral-400)',
        }}
      >
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
