// whatsapp.service.ts — envoi de messages WhatsApp via CallMeBot ou WA Business API
// Vérifie le hash anti-doublon avant chaque envoi
// Enregistre chaque tentative dans F8_LOG_ALERTES via la queue
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CacheService } from './cache.service';
import { SheetsQueueServiceService } from './sheets-queue.service';
import { EleveEnrichi, SoldeSnap, LogAlerte } from '../models';
import { environment } from '../../../environments/environment';

const LOG_SHEET = 'F8_LOG_ALERTES';
// Clé de stockage local pour le log anti-doublon
const DEDUP_KEY = 'wa_dedup_hashes';

@Injectable({ providedIn: 'root' })
export class WhatsappService {

  private http   = inject(HttpClient);
  private cache  = inject(CacheService);
  private queue  = inject(SheetsQueueServiceService);

  // ── Anti-doublon local ───────────────────────────

  /** Construit le hash unique : id_eleve + type + periode */
  private buildHash(idEleve: string, type: string, periode: string): string {
    return `${idEleve}_${type}_${periode}`;
  }

  /** Vérifie si ce message a déjà été envoyé (stockage localStorage) */
  private isDuplicate(hash: string): boolean {
    const hashes = this.loadHashes();
    return hashes.includes(hash);
  }

  /** Enregistre le hash après un envoi réussi */
  private markSent(hash: string): void {
    const hashes = this.loadHashes();
    hashes.push(hash);
    localStorage.setItem(DEDUP_KEY, JSON.stringify(hashes));
  }

  private loadHashes(): string[] {
    try {
      return JSON.parse(localStorage.getItem(DEDUP_KEY) ?? '[]');
    } catch { return []; }
  }

  // ── Construction du message ──────────────────────

  /** Remplace les variables du template : {nom_eleve}, {montant}, {date} */
  private interpoler(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (msg, [k, v]) => msg.replaceAll(`{${k}}`, v),
      template
    );
  }

  // ── Envoi rappel insolvable ──────────────────────

  /**
   * Envoie un rappel de paiement à un parent
   * @param row  élève enrichi avec solde
   * @param tel  numéro destinataire (père ou mère)
   */
  async envoyerRappelInsolvable(
    row: EleveEnrichi & { solde: SoldeSnap },
    tel: string
  ): Promise<void> {
    const periode = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const hash    = this.buildHash(row.id_eleve, 'rappel', periode);

    // Vérification anti-doublon
    if (this.isDuplicate(hash)) {
      console.warn(`⚠️ Doublon évité : ${hash}`);
      return;
    }

    // Récupère le template actif de type "rappel"
    const templates = this.cache.getFamilles(); // placeholder — à lire depuis F7
    const contenu   = environment.whatsappTemplate ?? 
      'Bonjour, le solde scolaire de {nom_eleve} est de {montant} FCFA restant. Merci.';

    const message = this.interpoler(contenu, {
      nom_eleve: `${row.nom} ${row.prenom}`,
      montant:   row.solde.reste_a_payer.toLocaleString(),
      classe:    row.classe?.nom_classe ?? '',
      date:      periode,
    });

    // Envoi via CallMeBot (gratuit) — remplacer par WA Business API si besoin
    const ok = await this.envoyerViaCallMeBot(tel, message);

    // Log dans F8 (via queue pour hors-ligne)
    const log: LogAlerte = {
      id_log:      `LOG-${Date.now()}`,
      id_eleve:    row.id_eleve,
      id_famille:  row.id_famille,
      id_template: 'TPL-RAPPEL',
      numero_dest: tel,
      date_envoi:  new Date().toISOString(),
      statut:      ok ? 'envoye' : 'echec',
      hash_dedup:  hash,
    };

    const logRow = [
      log.id_log, log.id_eleve, log.id_famille ?? '',
      log.id_template, log.numero_dest, log.date_envoi,
      log.statut, log.hash_dedup,
    ];
    this.queue.enqueue({ sheetName: LOG_SHEET, rowData: logRow }, 'addRow');

    if (ok) this.markSent(hash);
  }

  // ── Envoi rappel rendez-vous ─────────────────────

  async envoyerRappelRdv(
    nomEleve: string,
    tel: string,
    dateRdv: string,
    idEleve: string
  ): Promise<void> {
    const hash = this.buildHash(idEleve, 'rdv', dateRdv);
    if (this.isDuplicate(hash)) return;

    const message = `Rappel : rendez-vous de paiement pour ${nomEleve} le ${dateRdv}. Merci.`;
    const ok      = await this.envoyerViaCallMeBot(tel, message);

    const log: LogAlerte = {
      id_log:      `LOG-${Date.now()}`,
      id_eleve:    idEleve,
      id_template: 'TPL-RDV',
      numero_dest: tel,
      date_envoi:  new Date().toISOString(),
      statut:      ok ? 'envoye' : 'echec',
      hash_dedup:  hash,
    };
    this.queue.enqueue({
      sheetName: LOG_SHEET,
      rowData: [log.id_log, log.id_eleve, '', log.id_template,
                log.numero_dest, log.date_envoi, log.statut, log.hash_dedup],
    }, 'addRow');

    if (ok) this.markSent(hash);
  }

  // ── Transport CallMeBot ──────────────────────────

  /**
   * Envoie via CallMeBot API (gratuit, inscription WhatsApp requise)
   * Doc : https://www.callmebot.com/blog/free-api-whatsapp-messages/
   */
  private async envoyerViaCallMeBot(tel: string, message: string): Promise<boolean> {
    try {
      // CallMeBot attend le numéro au format international sans '+'
      const numero = tel.replace(/[^0-9]/g, '');
      const url = `https://api.callmebot.com/whatsapp.php` +
        `?phone=${numero}` +
        `&text=${encodeURIComponent(message)}` +
        `&apikey=${environment.callMeBotApiKey}`;

      await firstValueFrom(this.http.get(url, { responseType: 'text' }));
      return true;
    } catch (err) {
      console.error('WhatsApp envoi échoué :', err);
      return false;
    }
  }
}
