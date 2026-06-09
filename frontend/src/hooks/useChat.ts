import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { askReforma } from '../services/reforma.service';

const WELCOME: Message = {
  id: 'welcome',
  role: 'ai',
  content:
    'Olá! Sou o Assistente de Reforma Tributária da COESA. Posso responder suas dúvidas sobre a LCP 214, IBS, CBS, Split Payment e muito mais. Como posso ajudar?',
  timestamp: new Date(),
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || trimmed.length < 10) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await askReforma(trimmed);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.answer,
        sources: data.sources,
        confidence: data.confidence,
        latency_ms: data.latency_ms,
        model_used: data.model_used,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'ai',
        content:
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return { messages, isLoading, sendMessage };
}
