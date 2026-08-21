import { inject, Injectable } from "@angular/core";
import { CacheService } from "../cache.service";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";
import { Famille, Classe, FraisConfig, Enseignant, MatiereConfig, AnneeScolaireFamille, PointageResult, Eleve, Note, Paiement } from "../../models";
import { SHEET, H } from "./sheets";

// data-service.base.ts

@Injectable({ providedIn: 'root' })
export class DataServiceBase {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);

    public async initAppData(): Promise<void> {
        // await this.ensureSheets();

        console.log('chargement n1', Date.now());
        // Groupe A — données statiques (batchGet)
        const [rawFam, rawCls, rawFrais, rawEns, rawMat, rawAnn, rawPoi] = await this.batchFetch([
            `${SHEET.familles}!A:L`,
            `${SHEET.classes}!A:H`,
            `${SHEET.frais}!A:I`,
            `${SHEET.enseignants}!A:F`,
            `${SHEET.matieres}!A:H`,
            `${SHEET.anneesvc}!A:H`,
            `${SHEET.pointages}!A:F`,
        ]);
        this.cache.setFamilles(this.parse<Famille>(rawFam, H.familles));
        this.cache.setClasses(this.parse<Classe>(rawCls, H.classes));
        this.cache.setFrais(this.parse<FraisConfig>(rawFrais, H.frais));
        this.cache.setEnseignants(this.parse<Enseignant>(rawEns, H.enseignants));
        this.cache.setMatieres(this.parse<MatiereConfig>(rawMat, H.matieres));
        this.cache.setAnneeSvc(this.parse<AnneeScolaireFamille>(rawAnn, H.anneesvc));
        this.cache.setPointages(this.parse<PointageResult>(rawPoi, H.pointages));

        console.log('chargement n1', Date.now());

        // Groupe B — élèves + soldes
        const [rawElv, rawSol] = await this.batchFetch([
            `${SHEET.eleves}!A:K`,
            `${SHEET.soldes}!A:H`,
        ]);
        this.cache.setEleves(this.parse<Eleve>(rawElv, H.eleves));
        console.log('chargement n1', Date.now());

        // this.cache.setSoldes(this.parse<SoldeSnap>(rawSol, H.soldes));
        console.log('chargement n1', Date.now());

        // Groupe C — en arrière-plan (pas bloquant)
        this.sheets.fetchRaw(SHEET.notes).then(r =>
            this.cache.setNotes(this.parse<Note>(r, H.notes))
        );
        console.log('chargement n1', Date.now());

        this.sheets.fetchRaw(SHEET.paiements).then(r =>
            this.cache.setPaiements(this.parse<Paiement>(r, H.paiements))
        );
        console.log('chargement n1', Date.now());

    }

    public async ensureSheets(): Promise<void> {
        const entries = Object.entries(SHEET) as [keyof typeof SHEET, string][];
        await Promise.all(
            entries
                .filter(([key]) => key in H)
                .map(([key, name]) => this.sheets.createSheet({
                    sheetName: name,
                    headers: H[key as keyof typeof H] as unknown as string[],
                }))
        );
    }
    private parse<T>(rows: any[][], headers: readonly string[]): T[] {
        if (!rows?.length) return [];
        return rows.slice(1)
            .filter(r => r.length && r[0])
            .map(row => {
                const obj: any = {};
                headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
                return obj as T;
            });
    }
    private async batchFetch(ranges: string[]): Promise<any[][][]> {
        return (await this.sheets.batchGet(ranges)).filter((_, i) => i % 2 === 0);
    }

    public invalidateCache(): void { this.cache.invalidateAll(); }

}   