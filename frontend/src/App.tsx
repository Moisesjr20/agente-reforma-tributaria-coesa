import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';

export default function App() {
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
      <ChatHeader />
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
