// google-sheets.service.ts — service fourni, conservé tel quel
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as jose from 'jose';
import { environment } from '../../../../environments/environment';

export interface SheetConfig {
  sheetName: string;
  headers: string[];
}
export interface RowConfig {
  sheetName: string;
  rowData: any[];
}
export interface CellConfig {
  sheetName: string;
  row: number;
  col: number;
  value: any;
}
export interface DeleteRowConfig {
  sheetName: string;
  rowIndex: number;
}

interface IGoogleSheetsService {
  createSheet(config: SheetConfig): Promise<void>;
  addRow(config: RowConfig): Promise<void>;
  updateCell(config: CellConfig): Promise<void>;
  deleteRow(config: DeleteRowConfig): Promise<void>;
  findRowById(sheetName: string, id: any): Promise<number>;
  findSheetId(sheetName: string): Promise<number>;
  batchGet(ranges: string[]): Promise<any[][]>;
  fetchRaw(sheetName: string): Promise<any[][]>;
}



// ── En-têtes de colonnes (ordre = colonnes A, B, C…) ──────────────────
const HEADERS: Record<string, string[]> = {
  F1_FAMILLES: ['id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre', 'latitude', 'longitude', 'adresse_texte'],
  F2_ELEVES: ['id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom', 'date_naissance', 'date_inscription', 'statut'],
  F3_CLASSES: ['id_classe', 'nom_classe', 'niveau', 'cycle', 'annee_scolaire', 'effectif_max', 'enseignant_principal'],
  F4_PAIEMENTS: ['id_paiement', 'id_eleve', 'id_famille', 'montant_verse', 'date_paiement', 'mode_paiement', 'periode_concernee', 'date_prochain_rdv', 'recu_numero', 'notes_caissier', 'statut_alerte_whatsapp'],
  F5_FRAIS_CONFIG: ['id_frais', 'id_classe', 'type_frais', 'montant_total_attendu', 'seuil_insolvable', 'echeance_1', 'echeance_2', 'echeance_3', 'annee_scolaire'],
  F6_2026: ['id_note', 'id_eleve', 'id_classe', 'matiere', 'id_enseignant', 'sequence', 'note_obtenue', 'note_sur', 'annee_scolaire'],
  F7_MSG_TEMPLATES: ['id_template', 'type', 'objet', 'contenu', 'variables_dynamiques', 'actif', 'langue', 'destinataire'],
  F8_LOG_ALERTES: ['id_log', 'id_eleve', 'id_famille', 'id_template', 'numero_dest', 'date_envoi', 'statut', 'hash_dedup'],
  F9_SNAP: ['id_eleve', 'id_famille', 'total_verse', 'montant_attendu', 'reste_a_payer', 'statut_insolvable', 'dernier_paiement', 'nb_enfants_famille'],
  F10_ENSEIGNANTS: ['id_enseignant', 'nom', 'prenom', 'matieres_enseignees', 'tel', 'email', 'classes_assignees'],
  F11_SNAP: ['id_eleve', 'id_classe', 'sequence', 'moy_ponderee', 'rang', 'premier', 'dernier', 'mention', 'moy_classe'],
  F12_MATIERES_CONFIG: ['id_matiere', 'nom_matiere', 'id_classe', 'coefficient', 'note_eliminatoire'],
} as const;


@Injectable({ providedIn: 'root' })
export class GoogleSheetsService implements IGoogleSheetsService {

  private readonly BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
  private readonly SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(private http: HttpClient) {
    this.refreshToken();
  }



  // ── Authentification JWT ─────────────────────────

  private async refreshToken(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await jose.importPKCS8(
      environment.googlePrivateKey.replace(/\\n/g, '\n'), 'RS256'
    );
    const jwt = await new jose.SignJWT({ scope: this.SCOPE })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(environment.googleServiceAccountEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const response: any = await firstValueFrom(
      this.http.post('https://oauth2.googleapis.com/token', null, {
        params: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }
      })
    );
    this.accessToken = response.access_token;
    this.tokenExpiry = now + 3500;
  }

  private async getHeaders(): Promise<HttpHeaders> {
    if (!this.accessToken || Math.floor(Date.now() / 1000) >= this.tokenExpiry) {
      await this.refreshToken();
    }
    return new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    });
  }

  // ── Utilitaires URL ──────────────────────────────

  private rangeUrl(sheetName: string, cells: string): string {
    return `${encodeURIComponent(sheetName)}!${cells}`;
  }
  private appendUrl(sheetName: string, cells: string): string {
    return `${encodeURIComponent(sheetName)}!${cells}:append`;
  }

  // ── CRUD ─────────────────────────────────────────

  async createSheet(config: SheetConfig): Promise<void> {
    const headers = await this.getHeaders();
    const file: any = await firstValueFrom(
      this.http.get(`${this.BASE_URL}/${environment.spreadsheetId}`, { headers })
    );
    if (file.sheets?.some((s: any) => s.properties?.title === config.sheetName)) return;
    await firstValueFrom(
      this.http.post(
        `${this.BASE_URL}/${environment.spreadsheetId}:batchUpdate`,
        { requests: [{ addSheet: { properties: { title: config.sheetName } } }] },
        { headers }
      )
    );
    await firstValueFrom(
      this.http.put(
        `${this.BASE_URL}/${environment.spreadsheetId}/values/${this.rangeUrl(config.sheetName, 'A1')}?valueInputOption=RAW`,
        { values: [config.headers] },
        { headers }
      )
    );
  }

  async addRow(config: RowConfig): Promise<void> {


    const headers = await this.getHeaders();
    await firstValueFrom(
      this.http.post(
        `${this.BASE_URL}/${environment.spreadsheetId}/values/${this.appendUrl(config.sheetName, 'A1')}?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { values: [config.rowData] },
        { headers }
      )
    );
  }

  async updateCell(config: CellConfig): Promise<void> {
    const headers = await this.getHeaders();
    const cellRef = `${this.columnToLetter(config.col)}${config.row}`;
    await firstValueFrom(
      this.http.put(
        `${this.BASE_URL}/${environment.spreadsheetId}/values/${this.rangeUrl(config.sheetName, cellRef)}?valueInputOption=RAW`,
        { values: [[config.value]] },
        { headers }
      )
    );
  }

  async deleteRow(config: DeleteRowConfig): Promise<void> {
    if (config.rowIndex === 0) throw new Error('Cannot delete header row');
    const headers = await this.getHeaders();
    const sheetId = await this.getSheetId(config.sheetName);
    await firstValueFrom(
      this.http.post(
        `${this.BASE_URL}/${environment.spreadsheetId}:batchUpdate`,
        {
          requests: [{
            deleteDimension: {
              range: {
                sheetId, dimension: 'ROWS',
                startIndex: config.rowIndex, endIndex: config.rowIndex + 1,
              }
            }
          }]
        },
        { headers }
      )
    );
  }

  async findRowById(sheetName: string, id: any): Promise<number> {
    const headers = await this.getHeaders();
    const response: any = await firstValueFrom(
      this.http.get(
        `${this.BASE_URL}/${environment.spreadsheetId}/values/${this.rangeUrl(sheetName, 'A:A')}`,
        { headers }
      )
    );
    const rows = response.values ?? [];
    const idx = rows.findIndex((r: any[]) => r[0] === String(id));
    return idx === -1 ? -1 : idx + 1;
  }

  private async getSheetId(sheetName: string): Promise<number> {
    const headers = await this.getHeaders();
    const response: any = await firstValueFrom(
      this.http.get(`${this.BASE_URL}/${environment.spreadsheetId}`, { headers })
    );
    const sheet = response.sheets?.find((s: any) => s.properties?.title === sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    return sheet.properties.sheetId;
  }

  private columnToLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }


  async findSheetId(sheetName: string): Promise<number> {
    const headers = await this.getHeaders();
    const response: any = await firstValueFrom(
      this.http.get(`${this.BASE_URL}/${environment.spreadsheetId}`, { headers })
    );
    const sheet = response.sheets?.find((s: any) => s.properties?.title === sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    return sheet.properties.sheetId;
  }

  async batchGet(ranges: string[]): Promise<any[][]> {
    const headers = await this.getHeaders();
    const response: any = await firstValueFrom(
      this.http.get(
        `${this.BASE_URL}/${environment.spreadsheetId}/values:batchGet?ranges=${ranges.map(r => encodeURIComponent(r)).join('&ranges=')}`,
        { headers }
      )
    );
    const result: any[][] = [];
    for (const valueRange of response.valueRanges) {
      const range = valueRange.range.split('!')[0].replace(/'/g, '');
      result.push(valueRange.values ?? [], range);
    }
    return result;
  }

  async fetchRaw(sheetName: string): Promise<any[][]> {
    const headers = await this.getHeaders();
    const response: any = await firstValueFrom(
      this.http.get(
        `${this.BASE_URL}/${environment.spreadsheetId}/values/${this.rangeUrl(sheetName, 'A:Z')}`,
        { headers }
      )
    );
    return response.values ?? [];
  }
}
