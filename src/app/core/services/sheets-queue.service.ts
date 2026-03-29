// sheets-queue.service.ts — file d'attente persistante pour les écritures hors-ligne
// Fourni par l'utilisateur — conservé tel quel, adapté pour les imports locaux
import { effect, Injectable, signal } from '@angular/core';
import { CellConfig, DeleteRowConfig, GoogleSheetsService, RowConfig }
  from './@google-sheets/google-sheets.service';
import { from, EMPTY, of } from 'rxjs';
import { switchMap, map, catchError, filter, tap } from 'rxjs/operators';

interface QueueItem {
  id: string;
  payload: RowConfig | CellConfig | DeleteRowConfig | any;
  order: 'addRow' | 'updateCell' | 'deleteRow';
}

interface SheetsQueueServiceInterface {
  enqueue(payload: any, order: 'addRow' | 'updateCell' | 'deleteRow'): void;
  dequeue(): void;
  peek(): QueueItem;
  isEmpty(): boolean;
  size(): number;
}

const STORAGE_KEY = 'sheets_queue';
const SCHEDULED   = 2000;

@Injectable({ providedIn: 'root' })
export class SheetsQueueServiceService implements SheetsQueueServiceInterface {

  private queue    = signal<QueueItem[]>([]);
  private online   = signal(navigator.onLine);
  private scheduled: any;
  private syncing  = false;

  constructor(private sheets: GoogleSheetsService) {
    this.queue.set(this.load());

    window.addEventListener('online',  () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));

    effect(() => {
      this.save();
      if (this.online() && this.queue().length > 0) this.startScheduler();
    });
  }

  private startScheduler(): void {
    if (this.scheduled) return;
    this.scheduled = setInterval(() => {
      if (this.isEmpty()) {
        clearInterval(this.scheduled);
        this.scheduled = null;
        return;
      }
      this.sync();
    }, SCHEDULED);
  }

  enqueue(
    payload: RowConfig | CellConfig | DeleteRowConfig,
    order: 'addRow' | 'updateCell' | 'deleteRow'
  ): void {
    this.queue.update(list => [{ id: crypto.randomUUID(), payload, order }, ...list]);
  }

  dequeue(): void {
    this.queue.update(list => list.slice(1));
  }

  peek(): QueueItem { return this.queue()[0]; }
  isEmpty(): boolean { return this.size() === 0; }
  size(): number { return this.queue().length; }

  sync(): void {
    if (this.syncing || !this.online() || this.isEmpty()) return;
    this.syncing = true;
    const item   = this.peek();

    of(item).pipe(
      filter(i => !!i && !!i.order && !!i.payload),
      switchMap(i =>
        from(this.sheets[i.order](i.payload)).pipe(map(() => i))
      ),
      tap(i => {
        this.dequeue();
        console.log(`✅ Envoyé : ${i.id}`);
      }),
      catchError(err => {
        console.warn(`⚠️ Échec — ${item.id} conservé :`, err?.message ?? err);
        return EMPTY;
      }),
    ).subscribe({
      complete: () => { this.syncing = false; },
      error:    () => { this.syncing = false; },
    });
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue()));
  }
  private load(): QueueItem[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') ?? [];
    } catch { return []; }
  }
}
