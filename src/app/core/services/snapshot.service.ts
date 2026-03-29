// snapshot.service.ts — déclenche la regénération des snapshots F9 et F11
// via un Apps Script Web App déployé côté Google Sheets
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CacheService } from './cache.service';
import { DataService } from './data.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SnapshotService {

  private http  = inject(HttpClient);
  private cache = inject(CacheService);
  private data  = inject(DataService);

  /**
   * Déclenche la regénération de F9_SNAP (soldes) côté Apps Script,
   * puis recharge le cache local.
   * Le script Apps Script doit être déployé en tant que Web App
   * avec l'URL configurée dans environment.appsScriptUrl.
   */
  async regenererSoldes(): Promise<void> {
    const url = (environment as any).appsScriptUrl;
    if (url) {
      // Appelle le Web App Apps Script qui recalcule F9_SNAP dans Sheets
      await firstValueFrom(
        this.http.post(url, { action: 'regenererSoldes' })
      ).catch(() => {
        // Si le script n'est pas accessible, on recalcule en local
        console.warn('Apps Script inaccessible — recalcul local uniquement');
      });
    }

    // Recharge le snapshot depuis Sheets dans le cache
    await this.data.refreshSoldesSnap();
  }

  /** Regénère F11_SNAP (bulletins) et recharge le cache */
  async regenererBulletins(): Promise<void> {
    const url = (environment as any).appsScriptUrl;
    if (url) {
      await firstValueFrom(
        this.http.post(url, { action: 'regenererBulletins' })
      ).catch(() => null);
    }
    await this.data.refreshBulletinsSnap();
  }
}
