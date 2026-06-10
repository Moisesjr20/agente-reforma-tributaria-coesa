import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';
import { SourceCitations } from './SourceCitations';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fade-in-up 0.2s ease-out',
        }}
      >
        <div
          style={{
            background: 'var(--color-brand-gold)',
            color: '#1A1A1A',
            borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 var(--radius-2xl)',
            padding: 'var(--space-3) var(--space-4)',
            maxWidth: '75%',
            fontSize: 'var(--font-size-base)',
            lineHeight: 'var(--leading-relaxed)',
            fontWeight: 'var(--font-weight-medium)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        animation: 'fade-in-up 0.2s ease-out',
      }}
    >
      <div style={{ maxWidth: '85%' }}>
        <div
          className="ai-message"
          style={{
            background: 'var(--color-ai-surface)',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: '0 var(--radius-2xl) var(--radius-2xl) var(--radius-2xl)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--font-size-base)',
            lineHeight: 'var(--leading-relaxed)',
            color: 'var(--color-brand-charcoal)',
            wordBreak: 'break-word',
          }}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}
      </div>
    </div>
  );
}
