// exportXlsx.ts — aplica as correções aprovadas nas células da aba
// "MATRIZ REFORMA" do workbook original e baixa o .xlsx corrigido. As demais
// abas (RESUMO, LEGENDA, etc.) são preservadas. Tudo no navegador.
import * as XLSX from 'xlsx';
import { SHEET_NAME } from './parseXlsx';
import type { Correction } from './corrections';

export interface AppliedResult {
  applied: number;
  filename: string;
}

/** Escreve as correções nas células e devolve o Blob do .xlsx. */
export function buildCorrectedWorkbook(
  wb: XLSX.WorkBook,
  columns: string[],
  corrections: Correction[],
): Blob {
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Aba "${SHEET_NAME}" ausente no workbook.`);

  for (const c of corrections) {
    if (!c.para) continue;
    const col = columns.indexOf(c.campo);
    if (col < 0 || !c.linha) continue;
    const addr = XLSX.utils.encode_cell({ r: c.linha - 1, c: col });
    ws[addr] = { t: 's', v: c.para };
  }

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadCorrectedXlsx(
  wb: XLSX.WorkBook,
  columns: string[],
  corrections: Correction[],
  sourceName: string,
): AppliedResult {
  const applicable = corrections.filter((c) => c.para);
  const blob = buildCorrectedWorkbook(wb, columns, applicable);
  const base = sourceName.replace(/\.xlsx$/i, '');
  const filename = `${base}_corrigida.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { applied: applicable.length, filename };
}
