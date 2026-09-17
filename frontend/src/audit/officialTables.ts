// officialTables.ts — carrega as tabelas oficiais cClassTrib/CST (bundled em
// /tabelas/) e monta o AuditContext. As tabelas são públicas (não são dado do
// cliente), então podem ser servidas como assets estáticos.
import { csvToObjects, buildClassIndex, buildCstSet, type AuditContext } from './rules';

const CCLASS_URL = '/tabelas/cclass.csv';
const CST_URL = '/tabelas/cst.csv';
export const TABLE_VERSION = 'cclass-2026-06-01';

let cached: AuditContext | null = null;

export async function loadOfficialContext(): Promise<AuditContext> {
  if (cached) return cached;
  const [cclassText, cstText] = await Promise.all([
    fetch(CCLASS_URL).then((r) => {
      if (!r.ok) throw new Error(`Falha ao carregar tabela cClassTrib (${r.status})`);
      return r.text();
    }),
    fetch(CST_URL).then((r) => {
      if (!r.ok) throw new Error(`Falha ao carregar tabela CST (${r.status})`);
      return r.text();
    }),
  ]);
  cached = {
    classIndex: buildClassIndex(csvToObjects(cclassText)),
    cstSet: buildCstSet(csvToObjects(cstText)),
    tableVersion: TABLE_VERSION,
  };
  return cached;
}
