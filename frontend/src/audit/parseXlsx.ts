// parseXlsx.ts — lê a aba "MATRIZ REFORMA" de um .xlsx no navegador (SheetJS).
// Nada sai do browser: recebe um ArrayBuffer e devolve as linhas em memória.
import * as XLSX from 'xlsx';
import type { MatrixItem } from './rules';

export const SHEET_NAME = 'MATRIZ REFORMA';
const HEADER_ROW = 4; // 1-based (a matriz tem título/cabeçalhos nas linhas 1–4)

export class MatrixParseError extends Error {}

export interface ParseResult {
  sheet: string;
  columns: string[];
  items: MatrixItem[];
  wb: XLSX.WorkBook; // retido para reescrever/exportar a planilha corrigida
}

export function parseMatrixWorkbook(buf: ArrayBuffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: 'array' });
  } catch {
    throw new MatrixParseError('Arquivo inválido — não foi possível ler como planilha .xlsx.');
  }

  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    throw new MatrixParseError(
      `A planilha não tem a aba "${SHEET_NAME}". Abas encontradas: ${wb.SheetNames.join(', ') || '(nenhuma)'}.`,
    );
  }

  // Array de arrays, células como texto formatado, vazios como ''.
  const grid = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' });
  if (grid.length < HEADER_ROW) {
    throw new MatrixParseError('A aba não tem linhas de dados suficientes.');
  }

  const headers = (grid[HEADER_ROW - 1] ?? []).map((h) => String(h ?? '').trim());
  if (!headers.includes('cClassTrib (saída)') || !headers.includes('NCM (atual)')) {
    throw new MatrixParseError(
      'A aba "MATRIZ REFORMA" não tem as colunas esperadas (ex.: "cClassTrib (saída)", "NCM (atual)"). Confirme se é uma Matriz Fiscal COESA.',
    );
  }

  const items: MatrixItem[] = [];
  for (let r = HEADER_ROW; r < grid.length; r++) {
    const rowArr = grid[r] ?? [];
    const obj: MatrixItem = { __row: r + 1 };
    let hasData = false;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col${c + 1}`;
      const val = String(rowArr[c] ?? '').trim();
      if (val !== '') hasData = true;
      obj[key] = val;
    }
    if (hasData) items.push(obj);
  }

  if (!items.length) throw new MatrixParseError('Nenhum item encontrado na aba "MATRIZ REFORMA".');
  return { sheet: SHEET_NAME, columns: headers, items, wb };
}
