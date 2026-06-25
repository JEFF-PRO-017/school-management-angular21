 export function _dernierRdvFamille(f: any): string | null {
    if (!f) return null;
    const rdvs = (f.moratoires ?? [])
      .filter((m: any) => !m.regler && m.date_fin)
      .map((m: any) => m.date_fin as string);
    return rdvs.length ? rdvs.sort().at(-1)! : null;
  }
 
  export function _trunc(s: string, max: number): string {
    return s?.length > max ? s.slice(0, max - 1) + '…' : (s ?? '');
  }
 
  export function _fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0));
  }
 
  export const _fmtDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }