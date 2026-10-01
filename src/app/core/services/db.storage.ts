// db.storage.ts — seul fichier qui parle à IndexedDB (npm i idb-keyval)
import { createStore, getMany, setMany, clear } from 'idb-keyval';
import { Db, PERSISTED, TableName } from '../../../../db.model';

const store = createStore('ecole-cache', 'kv');

/** Lit IndexedDB. Retourne seulement les tables trouvées. */
export async function loadDb(): Promise<Partial<Db>> {
  const values = await getMany(PERSISTED, store);
  const out: any = {};
  PERSISTED.forEach((t, i) => {
    if (values[i] !== undefined) out[t] = values[i];
  });
  return out;
}

/** Sauvegarde uniquement les tables indiquées. */
export function saveTables(db: Db, tables: TableName[]): Promise<void> {
  return setMany(tables.map(t => [t, db[t]] as [string, unknown]), store);
}

/** Vide complètement IndexedDB. */
export function wipeStorage(): Promise<void> {
  return clear(store);
}