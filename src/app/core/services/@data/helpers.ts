import { PermissionId } from "../../models";
import { BLOC } from "./sheets";

export function toRow(obj: any, headers: readonly string[]): any[] {
    return headers.map(k => obj[k] ?? '');
}

export function parse<T>(rows: any[][], headers: readonly string[]): T[] {
    if (!rows?.length) return [];
    return rows.slice(1)
        .filter(r => r.length && r[0])
        .map(row => {
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
            return obj as T;
        });
}


export async function chargerEnArrierePlan(
    feuille: string,
    headers: readonly string[],
    onBloc: (rows: any[][]) => void
): Promise<void> {
    let debut = 2; // ligne 1 = en-têtes, on commence à la ligne 2

    while (true) {
        const plage = `${feuille}!A${debut}:Z${debut + BLOC - 1}`;

        let lignes: any[][] | null;
        try {
            lignes = await this.sheets.getRange(plage);
        } catch (err) {
            console.error(`[${feuille}] bloc à partir de ${debut} abandonné`, err);
            return; // erreur non gérée par l'interceptor (ex: réseau HS) → on arrête cette feuille
        }

        if (!lignes?.length) break;       // plus rien → terminé
        onBloc(lignes);                   // alimente le cache avec ce bloc
        if (lignes.length < BLOC) break;  // bloc incomplet → c'était le dernier
        debut += BLOC;                    // passe au bloc suivant
    }
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Évite de saturer l'API Google Sheets (quota par minute) si on a beaucoup de feuilles.
export async function chargerToutesEnArrierePlan(
    taches: Array<() => Promise<void>>,
    concurrence = 3
): Promise<void> {
    let index = 0;

    const suivant = async (): Promise<void> => {
        if (index >= taches.length) return;
        const i = index++;
        await taches[i]();
        return suivant();
    };

    await Promise.all(
        Array.from({ length: concurrence }, () => suivant())
    );
}

export function concatStrings(arr: PermissionId[] | string[]): string {
  return Array.isArray(arr) ? arr.join(',') : '';
}
export function deconcatString(s: string): PermissionId[] {
  return s ? (s.split(',').filter(Boolean) as PermissionId[]) : [];
}

