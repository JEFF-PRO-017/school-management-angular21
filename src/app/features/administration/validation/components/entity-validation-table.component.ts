import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, ContentChildren, QueryList } from '@angular/core';
import { TableComponent, TableColumn ,CellDefDirective} from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-entity-validation-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableComponent],
  template: `
<div>
  <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
    <div class="d-flex align-items-center gap-2">
      <h6 class="mb-0">{{ title }}</h6>
      <span class="badge text-bg-warning">{{ data.length }} en attente</span>
    </div>
    <div class="d-flex gap-2">
      <button class="btn btn-sm btn-outline-secondary" (click)="refresh.emit()" [disabled]="loading">
        @if (loading) { <span class="spinner-border spinner-border-sm me-1"></span> }
        Actualiser
      </button>
      @if (selection().length > 0) {
        <button class="btn btn-sm btn-success" [disabled]="busy" (click)="onValider()">
          ✅ Valider ({{ selection().length }})
        </button>
        <button class="btn btn-sm btn-danger" [disabled]="busy" (click)="onSupprimer()">
          🗑 Supprimer ({{ selection().length }})
        </button>
      }
    </div>
  </div>

<app-table
    [columns]="columns"
    [data]="data"
    [selectable]="true"
    [rowIdFn]="idFn"
    [isGlobalFilter]="true"
    [emptyMessage]="'Aucun élément en attente'"
    [externalCellDefs]="cellDefs?.toArray()"
    (selectionChange)="selection.set($event)" />
</div>
  `
})
export class EntityValidationTableComponent<T = any> {
  @Input({ required: true }) title = '';
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input({ required: true }) data: T[] = [];
  @Input({ required: true }) idFn: (row: T) => unknown = (r: any) => r.id;
  @Input() loading = false;
  @Input() busy = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() valider = new EventEmitter<T[]>();
  @Output() supprimer = new EventEmitter<T[]>();
  @ContentChildren(CellDefDirective) cellDefs?: QueryList<CellDefDirective>;

  selection = signal<T[]>([]);

  onValider(): void {
    if (!confirm(`Valider ${this.selection().length} élément(s) sélectionné(s) ?`)) return;
    this.valider.emit(this.selection());
  }

  onSupprimer(): void {
    if (!confirm(`Supprimer définitivement ${this.selection().length} élément(s) ?`)) return;
    this.supprimer.emit(this.selection());
  }
}