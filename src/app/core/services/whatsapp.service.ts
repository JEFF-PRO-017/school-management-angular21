// whatsapp.service.ts — service centralisé WhatsApp
// ─────────────────────────────────────────────────────────────────
// SEULE SOURCE DE VÉRITÉ pour tout ce qui touche à WhatsApp.
// Les composants n'ont aucune connaissance du transport ni du format.
//
// API publique :
//   ouvrirWA(famille, template?)
//     → ouvre wa.me manuellement, sans anti-doublon
//   ouvrirWAMasse(familles, template?) → number
//     → idem pour une liste, retourne le nb d'onglets ouverts
//   envoyerRappel(famille, template, type, periode) → EnvoiStatut
//     → rappel paiement (insolvables)
//   envoyerAbsence(eleve, nbAbs, template, periode) → EnvoiStatut
//     → signalement absence parent
//   envoyerMoyennes(eleve, titre, seqs, trim, rang, effectif, tpl, periode)
//     → résultats élève
//
// Transport auto : CallMeBot si environment.callMeBotApiKey défini,
//                  sinon repli sur wa.me
// Anti-doublon   : hash localStorage + log F8_LOG_ALERTES
// Variables      : {nom_famille} {nom_eleve} {montant} {restant}
//                  {annee} {rdv} {classe} {date}
// ─────────────────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { HttpClient }          from '@angular/common/http';
import { firstValueFrom }      from 'rxjs';

import { CacheService }  from './cache.service';
import {
  Famille, EleveEnrichi, MsgTemplate, LogAlerte
} from '../models/last_index';
import { environment } from '../../../environments/environment';

// ── Type unifié retourné par toutes les méthodes d'envoi auto ────
export type EnvoiStatut = 'envoye' | 'doublon' | 'echec' | 'sans_numero';

const DEDUP_KEY = 'wa_dedup_hashes';
const INDICATIF = '+237';   // Cameroun

// ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class WhatsappService {

  private http  = inject(HttpClient);
  private cache = inject(CacheService);

  // ══════════════════════════════════════════════════════════════
  // MODE MANUEL — wa.me (gratuit, ouverture navigateur)
  // Pas d'anti-doublon : l'utilisateur décide d'envoyer ou non.
  // ══════════════════════════════════════════════════════════════

  /** Ouvre WhatsApp Web avec le message pré-rempli pour une famille. */
  ouvrirWA(famille: any, template?: MsgTemplate | null): void {
    const tel = this.choisirTel(famille);
    if (!tel) return;
    const msg = this.interpoler(
      template?.contenu ?? this.msgDefautRappel(),
      this.varsFromFamille(famille)
    );
    this.ouvrirWaMe(tel, msg);
  }

  /**
   * Ouvre wa.me en boucle pour une liste de familles.
   * @returns Nombre d'onglets effectivement ouverts (familles avec numéro)
   */
  ouvrirWAMasse(familles: Famille[], template?: MsgTemplate | null): number {
    let n = 0;
    familles.forEach(f => { if (this.choisirTel(f)) { this.ouvrirWA(f, template); n++; } });
    return n;
  }

  // ══════════════════════════════════════════════════════════════
  // MODE AUTO — CallMeBot ou wa.me selon environment
  // Anti-doublon actif. Log dans F8_LOG_ALERTES.
  // ══════════════════════════════════════════════════════════════

  /**
   * Rappel de paiement à une famille.
   * @param type    sert au hash anti-doublon (ex: 'rappel', 'rdv')
   * @param periode sert au hash anti-doublon (ex: '2026-04', '2025-2026')
   */
  async envoyerRappel(
    famille:  Famille,
    template: MsgTemplate | null,
    type:     string,
    periode:  string
  ): Promise<EnvoiStatut> {
    const tel = this.choisirTel(famille);
    if (!tel) return 'sans_numero';

    const hash = this.buildHash(famille.id_famille, type, periode);
    if (this.isDuplicate(hash)) return 'doublon';

    const msg = this.interpoler(
      template?.contenu ?? this.msgDefautRappel(),
      this.varsFromFamille(famille)
    );

    const ok = await this.envoyer(tel, msg);
    this.logEtMarquer({
      id_famille:  famille.id_famille,
      id_eleve:    famille.eleves?.[0]?.id_eleve ?? '',
      id_template: template?.id_template ?? 'rappel',
      numero_dest: tel,
      hash_dedup:  hash,
    }, ok);

    return ok ? 'envoye' : 'echec';
  }

  /**
   * Signalement d'absence aux parents d'un élève.
   * @param eleve  EleveEnrichi — id_famille obligatoire
   * @param nbAbs  nombre d'absences à mentionner
   */
  async envoyerAbsence(
    eleve:    EleveEnrichi,
    nbAbs:    number,
    template: MsgTemplate | null,
    periode:  string
  ): Promise<EnvoiStatut> {
    const famille = this.cache.famillesMap().get(eleve.id_famille);
    if (!famille) return 'sans_numero';

    const tel = this.choisirTel(famille);
    if (!tel)  return 'sans_numero';

    const hash = this.buildHash(eleve.id_eleve, 'absence', periode);
    if (this.isDuplicate(hash)) return 'doublon';

    const nomClasse = eleve.classe?.nom_classe
      ?? this.cache.classesMap().get(eleve.id_classe)?.nom_classe
      ?? '';

    const msg = this.interpoler(
      template?.contenu
        ?? `Bonjour {nom_famille}, votre enfant {nom_eleve} ({classe})`
         + ` a été absent(e) ${nbAbs} fois. Merci de contacter l'administration.`,
      {
        ...this.varsFromFamille(famille),
        nom_eleve: `${eleve.nom} ${eleve.prenom}`,
        classe:    nomClasse,
      }
    );

    const ok = await this.envoyer(tel, msg);
    this.logEtMarquer({
      id_famille:  famille.id_famille,
      id_eleve:    eleve.id_eleve,
      id_template: template?.id_template ?? 'absence',
      numero_dest: tel,
      hash_dedup:  hash,
    }, ok);

    return ok ? 'envoye' : 'echec';
  }

  /**
   * Envoi des moyennes d'un élève à ses parents.
   * @param moySeqs  liste { seq, moy } pour chaque séquence du bulletin
   * @param moyTrim  moyenne trimestrielle (null si non calculable)
   * @param rang     rang dans la classe (null si non calculé)
   * @param effectif nb d'élèves dans la classe (pour afficher "rang/effectif")
   */
  async envoyerMoyennes(
    eleve:         EleveEnrichi,
    titreBulletin: string,
    moySeqs:       { seq: string; moy: number | null }[],
    moyTrim:       number | null,
    rang:          number | null,
    effectif:      number,
    template:      MsgTemplate | null,
    periode:       string
  ): Promise<EnvoiStatut> {
    const famille = this.cache.famillesMap().get(eleve.id_famille);
    if (!famille) return 'sans_numero';

    const tel = this.choisirTel(famille);
    if (!tel)  return 'sans_numero';

    const hash = this.buildHash(eleve.id_eleve, 'bulletin', periode);
    if (this.isDuplicate(hash)) return 'doublon';

    const nomClasse = eleve.classe?.nom_classe
      ?? this.cache.classesMap().get(eleve.id_classe)?.nom_classe
      ?? '';

    const lignesSeqs = moySeqs
      .map(({ seq, moy }) => `  ${seq} : ${moy !== null ? moy.toFixed(2) : '—'}/20`)
      .join('\n');

    const contenuDefaut =
        `Bonjour {nom_famille}, résultats de {nom_eleve} ({classe})`
      + ` — ${titreBulletin} :\n${lignesSeqs}`
      + (moyTrim !== null ? `\n  Moyenne : ${moyTrim.toFixed(2)}/20` : '')
      + (rang    !== null ? `\n  Rang : ${rang}/${effectif}`          : '')
      + `\n\nMerci — CSB Berceau du Savoir`;

    const msg = this.interpoler(
      template?.contenu ?? contenuDefaut,
      {
        ...this.varsFromFamille(famille),
        nom_eleve: `${eleve.nom} ${eleve.prenom}`,
        classe:    nomClasse,
      }
    );

    const ok = await this.envoyer(tel, msg);
    this.logEtMarquer({
      id_famille:  famille.id_famille,
      id_eleve:    eleve.id_eleve,
      id_template: template?.id_template ?? 'bulletin',
      numero_dest: tel,
      hash_dedup:  hash,
    }, ok);

    return ok ? 'envoye' : 'echec';
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS PUBLICS
  // ══════════════════════════════════════════════════════════════

  /** Numéro prioritaire : père d'abord, mère en repli. */
  choisirTel(f: any): string {
    return (f.tel_pere || f.tel_mere || '').replace(/\s+/g, '');
  }

  /** Interpole les variables {clé} dans un contenu. */
  interpoler(contenu: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (msg, [k, v]) => msg.replaceAll(`{${k}}`, v),
      contenu
    );
  }

  /**
   * Calcule les variables d'interpolation depuis une Famille.
   * Toutes les valeurs sont des chaînes prêtes à être injectées dans un template.
   *
   * Variables disponibles :
   *   {nom_famille}  {nom_eleve}  {montant}  {restant}
   *   {annee}        {rdv}        {classe}   {date}
   */
  varsFromFamille(f: Famille): Record<string, string> {
    const annee   = f.annee_scolaire
      ?? `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    const attendu = +(f.montant_total_attendu ?? 0) - +(f.montant_reduction ?? 0);
    const verse   = (f.paiements ?? []).reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
    const restant = Math.max(0, attendu - verse);
    const rdvs    = (f.paiements ?? [])
      .map(p => p.date_prochain_rdv).filter(Boolean) as string[];
    const rdv     = rdvs.length ? this.fmtDate(rdvs.sort().at(-1)!) : 'à définir';
    const premier = f.eleves?.[0];

    return {
      nom_famille: f.nom_famille,
      nom_eleve:   premier ? `${premier.nom} ${premier.prenom}` : f.nom_famille,
      montant:     this.fcfa(attendu),
      restant:     this.fcfa(restant),
      annee,
      rdv,
      classe: premier
        ? (this.cache.classesMap().get(premier.id_classe)?.nom_classe ?? '')
        : '',
      date: new Date().toLocaleDateString('fr-FR',
        { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // PRIVÉ — Transport
  // ══════════════════════════════════════════════════════════════

  /**
   * Sélectionne automatiquement le transport :
   *   - CallMeBot si environment.callMeBotApiKey est défini
   *   - wa.me sinon (ouverture navigateur, toujours "vrai" côté client)
   */
  private async envoyer(tel: string, message: string): Promise<boolean> {
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

  // ══════════════════════════════════════════════════════════════
  // PRIVÉ — Anti-doublon localStorage
  // ══════════════════════════════════════════════════════════════

  private buildHash(id: string, type: string, periode: string): string {
    return `${id}_${type}_${periode}`;
  }

  private isDuplicate(hash: string): boolean {
    return this.loadHashes().includes(hash);
  }

  private markSent(hash: string): void {
    const hashes = this.loadHashes();
    hashes.push(hash);
    localStorage.setItem(DEDUP_KEY, JSON.stringify(hashes));
  }

  private loadHashes(): string[] {
    try   { return JSON.parse(localStorage.getItem(DEDUP_KEY) ?? '[]'); }
    catch { return []; }
  }

  // ══════════════════════════════════════════════════════════════
  // PRIVÉ — Log F8_LOG_ALERTES
  // ══════════════════════════════════════════════════════════════

  private logEtMarquer(
    partial: Omit<LogAlerte, 'id_log' | 'date_envoi' | 'statut'>,
    ok:      boolean
  ): void {
    const log: LogAlerte = {
      ...partial,
      id_log:     `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      date_envoi: new Date().toISOString(),
      statut:     ok ? 'envoye' : 'echec',
    };
    // this.data.addLog(log);   // cache + queue Sheets
    if (ok) this.markSent(partial.hash_dedup);
  }

  // ══════════════════════════════════════════════════════════════
  // PRIVÉ — Formatage
  // ══════════════════════════════════════════════════════════════

  private fmtTel(tel: string): string {
    const clean = tel.replace(/\s+/g, '');
    return clean.startsWith('+') ? clean : `${INDICATIF}${clean}`;
  }

  private fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }

  private fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  private msgDefautRappel(): string {
    return 'Bonjour {nom_famille}, un solde de {restant} FCFA reste à régler ({annee}). RDV : {rdv}.';
  }
}