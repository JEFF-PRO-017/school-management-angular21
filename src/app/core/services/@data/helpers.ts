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

