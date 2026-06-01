import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

const setup = (overrides: { onSend?: ReturnType<typeof vi.fn>; isLoading?: boolean } = {}) => {
  const onSend = overrides.onSend ?? vi.fn();
  const isLoading = overrides.isLoading ?? false;
  render(<ChatInput onSend={onSend} isLoading={isLoading} />);
  const textarea = screen.getByRole('textbox');
  const button = screen.getByRole('button');
  return { onSend, textarea, button };
};

describe('ChatInput — estado inicial', () => {
  it('textarea começa vazio', () => {
    const { textarea } = setup();
    expect(textarea).toHaveValue('');
  });

  it('botão começa desabilitado (campo vazio)', () => {
    const { button } = setup();
    expect(button).toBeDisabled();
  });
});

describe('ChatInput — validação de tamanho mínimo', () => {
  it('botão permanece desabilitado com menos de 10 chars', async () => {
    const user = userEvent.setup();
    const { textarea, button } = setup();
    await user.type(textarea, 'curto');
    expect(button).toBeDisabled();
  });

  it('aviso "Pergunta muito curta" aparece com 1–9 chars', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('textbox'), 'abc');
    expect(screen.getByText(/Pergunta muito curta/i)).toBeInTheDocument();
  });

  it('aviso desaparece quando atinge 10 chars', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('textbox'), '1234567890');
    expect(screen.queryByText(/Pergunta muito curta/i)).not.toBeInTheDocument();
  });

  it('botão é habilitado com 10+ chars', async () => {
    const user = userEvent.setup();
    const { textarea, button } = setup();
    await user.type(textarea, '1234567890');
    expect(button).toBeEnabled();
  });
});

describe('ChatInput — envio de mensagem', () => {
  it('Enter chama onSend com o texto digitado', async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, 'Qual é o IBS na reforma?');
    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend).toHaveBeenCalledWith('Qual é o IBS na reforma?');
  });

  it('Shift+Enter NÃO chama onSend (nova linha)', async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, 'Qual é o IBS na reforma?');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clicar no botão chama onSend', async () => {
    const user = userEvent.setup();
    const { onSend, textarea, button } = setup();
    await user.type(textarea, 'Qual é o CBS na reforma?');
    await user.click(button);
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('após envio o textarea é limpo', async () => {
    const user = userEvent.setup();
    const { textarea } = setup();
    await user.type(textarea, 'Pergunta válida aqui ok');
    await user.keyboard('{Enter}');
    expect(textarea).toHaveValue('');
  });
});

describe('ChatInput — estado de loading', () => {
  it('textarea fica desabilitado quando isLoading=true', () => {
    const { textarea } = setup({ isLoading: true });
    expect(textarea).toBeDisabled();
  });

  it('botão fica desabilitado quando isLoading=true mesmo com texto suficiente', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(<ChatInput onSend={onSend} isLoading={false} />);
    await user.type(screen.getByRole('textbox'), '1234567890');

    rerender(<ChatInput onSend={onSend} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
