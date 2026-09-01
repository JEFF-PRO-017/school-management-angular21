// whatsapp.service.ts — service centralisé WhatsApp
// Texte interpolé côté client, envoyé via l'API Gupshup (texte libre, /wa/api/v1/msg).
// Toutes les méthodes d'envoi auto passent par la fonction générique `envoyer()`.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ANNEE_SCOLAIRE, FamilleEnrichi, FamilleService } from '../../models';


export type EnvoiStatut = 'envoye' | 'doublon' | 'echec' | 'sans_numero';
export interface Message { tel: string, msg: string }

const INDICATIF = '+237';
const GUPSHUP_ENDPOINT = 'https://api.gupshup.io/wa/api/v1/msg';

@Injectable({ providedIn: 'root' })
export class WhatsappService {

  private http = inject(HttpClient);
  private fa = inject(FamilleService)

  // ══════════════════════════════════════════════════════════════
  // HELPERS PUBLICS
  // ══════════════════════════════════════════════════════════════

  choisirTel(f: any): string {
    return (f.tel_mere || f.tel_pere || '').replace(/\s+/g, '');
  }
  msgDefautRappel(f: any): string {
    const faTraitee = this.fa.initService(f)
    return `Bonjour ${f.nom_famille}, un solde de ${faTraitee.montantRestant} FCFA reste à régler (${ANNEE_SCOLAIRE}). RDV :  ${faTraitee.dernierRdvFamille}.`;
  }

  interpoler(contenu: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (msg, [k, v]) => msg.replaceAll(`{${k}}`, v),
      contenu
    );
  }

  async send_message_bulk(msgs: Message[]) {
    msgs.forEach(element => {
      this.send_message(element)
    });
  }

  /** Envoie un texte libre via Gupshup. Seule fonction qui appelle l'API. */
  private async send_message(msg: Message): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const destination = this.fmtTel(msg.tel).replace('', '');

    const body = new URLSearchParams({
      channel: 'whatsapp',
      source: environment.gupshup.sourceNumber,
      destination,
      'src.name': environment.gupshup.appName,
      message: JSON.stringify({ type: 'text', text: msg.msg }),
    });

    try {
      const reponse = await firstValueFrom(
        this.http.post<{ status: string; messageId: string }>(
          GUPSHUP_ENDPOINT,
          body.toString(),
          {
            headers: {
              apikey: environment.gupshup.apiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      // "submitted" veut dire accepté par Gupshup, pas encore livré au client
      // le vrai statut de livraison arrive plus tard via ton webhook

      if (reponse.status === 'submitted') {
        return { ok: true, messageId: reponse.messageId };
      }
      return { ok: false, error: `Statut inattendu: ${reponse.status}` };
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      // Gupshup renvoie souvent le détail de l'échec dans err.error
      console.error('[WhatsappService] Échec appel API Gupshup :', httpErr.error ?? httpErr.message);
      return { ok: false, error: httpErr.error?.message ?? 'Erreur inconnue' };
    }
  }

  private fmtTel(tel: string): string {
    const clean = tel.replace(/\s+/g, '');
    return clean.startsWith('+') ? clean : `${INDICATIF}${clean}`;
  }


  /**
   * Sélectionne automatiquement le transport :
   *   - CallMeBot si environment.callMeBotApiKey est défini
   *   - wa.me sinon (ouverture navigateur, toujours "vrai" côté client)
   */
  public async envoyer(tel: string, message: string): Promise<boolean> {
    if (environment.callMeBotApiKey) {
      return this.envoyerViaCallMeBot(tel, message);
    }
    this.ouvrirWaMe(tel, message);
    return true;
  }

  /** Envoi automatique via CallMeBot (inscription unique requise). */
  private async envoyerViaCallMeBot(tel: string, message: string): Promise<boolean> {
    try {
      const numero = tel.replace(/[^0-9]/g, '');
      const url =
        `https://api.callmebot.com/whatsapp.php` +
        `?phone=${numero}` +
        `&text=${encodeURIComponent(message)}` +
        `&apikey=${environment.callMeBotApiKey}`;
      await firstValueFrom(this.http.get(url, { responseType: 'text' }));
      return true;
    } catch {
      // Repli silencieux sur wa.me en cas d'échec réseau CallMeBot
      this.ouvrirWaMe(tel, message);
      return false;
    }
  }

  /** Ouvre wa.me dans un nouvel onglet. */
  private ouvrirWaMe(tel: string, message: string): void {
    window.open(
      `https://wa.me/${this.fmtTel(tel)}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  }


}