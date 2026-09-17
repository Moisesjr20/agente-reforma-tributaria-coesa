import { useState, lazy, Suspense } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';

// Carregado sob demanda: só puxa o SheetJS quando a aba de auditoria abre.
const AuditView = lazy(() => import('./components/AuditView').then((m) => ({ default: m.AuditView })));

type Tab = 'assistente' | 'auditoria';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-3) var(--space-5)',
        border: 'none',
        borderBottom: `2px solid ${active ? 'var(--color-brand-gold)' : 'transparent'}`,
        background: 'transparent',
        color: active ? 'var(--color-brand-charcoal)' : 'var(--color-neutral-600)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('assistente');
  // Mantido montado para preservar a conversa ao alternar de aba.
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '860px',
        margin: '0 auto',
        background: 'var(--color-white)',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      <nav
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          padding: '0 var(--space-6)',
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-neutral-200)',
          flexShrink: 0,
        }}
      >
        <TabButton active={tab === 'assistente'} onClick={() => setTab('assistente')}>Assistente</TabButton>
        <TabButton active={tab === 'auditoria'} onClick={() => setTab('auditoria')}>Auditoria de Planilha</TabButton>
      </nav>

      {tab === 'assistente' ? (
        <>
          <ChatHeader />
          <MessageList messages={messages} isLoading={isLoading} />
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </>
      ) : (
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-neutral-400)' }}>Carregando auditoria…</div>}>
          <AuditView />
        </Suspense>
      )}
    </div>
  );
}
