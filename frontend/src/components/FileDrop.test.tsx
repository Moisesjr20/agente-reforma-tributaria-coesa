import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDrop } from './FileDrop';

describe('FileDrop', () => {
  it('mostra a chamada e o aviso de privacidade', () => {
    render(<FileDrop onFile={vi.fn()} />);
    expect(screen.getByText(/Arraste a Matriz Fiscal/i)).toBeInTheDocument();
    expect(screen.getByText(/não é enviado a nenhum servidor/i)).toBeInTheDocument();
  });

  it('chama onFile ao selecionar um .xlsx', async () => {
    const onFile = vi.fn();
    const { container } = render(<FileDrop onFile={onFile} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'matriz.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledOnce();
    expect(onFile.mock.calls[0][0].name).toBe('matriz.xlsx');
  });
});
