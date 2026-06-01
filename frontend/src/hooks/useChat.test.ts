import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';

const WELCOME_CONTENT = 'Olá! Sou o Assistente de Reforma Tributária da COESA';

const mockOkResponse = (data: object) =>
  Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));

const mockErrorResponse = (status: number) =>
  Promise.resolve(new Response('error', { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useChat — estado inicial', () => {
  it('começa com a mensagem de boas-vindas', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toContain(WELCOME_CONTENT);
    expect(result.current.messages[0].role).toBe('ai');
  });

  it('começa com isLoading = false', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useChat — guards de envio', () => {
  it('ignora mensagens com menos de 10 caracteres', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('curta'); });
    expect(result.current.messages).toHaveLength(1); // só a boas-vindas
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('ignora string vazia', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage(''); });
    expect(result.current.messages).toHaveLength(1);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('ignora string só de espaços', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('         '); });
    expect(result.current.messages).toHaveLength(1);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('aceita mensagem com exatamente 10 caracteres', async () => {
    vi.mocked(fetch).mockReturnValue(mockOkResponse({
      answer: 'Resposta',
      sources: [],
      confidence: 0.9,
      latency_ms: 100,
      model_used: 'test-model',
    }));
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('1234567890'); });
    expect(result.current.messages).toHaveLength(3); // boas-vindas + user + ai
  });
});

describe('useChat — fluxo de mensagens', () => {
  it('adiciona mensagem do usuário e resposta da IA ao estado', async () => {
    vi.mocked(fetch).mockReturnValue(mockOkResponse({
      answer: 'O IBS é o Imposto sobre Bens e Serviços.',
      sources: [{ slug: 'lcp-214', title: 'LC 214', similarity: 0.92 }],
      confidence: 0.92,
      latency_ms: 350,
      model_used: 'qwen/qwen-2.5-72b-instruct',
    }));

    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('O que é o IBS na reforma?'); });

    const msgs = result.current.messages;
    expect(msgs).toHaveLength(3);

    const userMsg = msgs[1];
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('O que é o IBS na reforma?');

    const aiMsg = msgs[2];
    expect(aiMsg.role).toBe('ai');
    expect(aiMsg.content).toBe('O IBS é o Imposto sobre Bens e Serviços.');
    expect(aiMsg.confidence).toBe(0.92);
    expect(aiMsg.model_used).toBe('qwen/qwen-2.5-72b-instruct');
  });

  it('adiciona mensagem de erro quando o fetch falha com HTTP 500', async () => {
    vi.mocked(fetch).mockReturnValue(mockErrorResponse(500));
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('Pergunta válida aqui'); });

    const msgs = result.current.messages;
    expect(msgs).toHaveLength(3); // boas-vindas + user + erro
    expect(msgs[2].role).toBe('ai');
    expect(msgs[2].content).toContain('Não foi possível conectar');
  });

  it('adiciona mensagem de erro quando fetch lança exceção de rede', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.sendMessage('Pergunta válida aqui'); });

    const msgs = result.current.messages;
    expect(msgs[2].content).toContain('Não foi possível conectar');
  });

  it('isLoading é true durante o fetch e false depois', async () => {
    let resolvePromise!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useChat());

    act(() => { result.current.sendMessage('Pergunta longa o suficiente aqui'); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise(new Response(JSON.stringify({
        answer: 'ok', sources: [], confidence: 0.8, latency_ms: 100, model_used: 'm',
      }), { status: 200 }));
    });
    expect(result.current.isLoading).toBe(false);
  });
});
