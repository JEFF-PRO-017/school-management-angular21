// shared/table.component.ts — Tableau générique réutilisable (équivalent Angular du TableContainer React/TanStack)
//
// Dépendances à installer si absentes :
//   npm install xlsx jspdf jspdf-autotable
//
// Usage minimal :
//
// columns: TableColumn<Matiere>[] = [
//   { id: 'nom',    header: 'Matière', accessor: m => m.nom_matiere, sortable: true, filterable: true },
//   { id: 'classe', header: 'Classe',  accessor: m => this.nomClasse(m.id_classe), sortable: true, align: 'center' },
//   { id: 'coef',   header: 'Coef.',   accessor: m => m.coefficient, sortable: true, align: 'center' },
//   { id: 'actions',header: 'Actions', exportable: false, align: 'center' },
// ];
//
// <app-table
//   [columns]="columns"
//   [data]="filtered()"
//   [isGlobalFilter]="true"
//   [isExport]="true"
//   exportFilename="matieres"
//   [pageSize]="10">
//
//   <ng-template cellDef="nom" let-m>
//     <div class="d-flex align-items-center gap-2">
//       <div class="rounded-circle ..." [style.background]="avBg(m.id_matiere)">{{ abrev(m.nom_matiere) }}</div>
//       {{ m.nom_matiere }}
//     </div>
//   </ng-template>
//
//   <ng-template cellDef="actions" let-m>
//     <button class="btn btn-sm btn-outline-secondary" (click)="ouvrirModal(m)">Modifier</button>
//   </ng-template>
//
// </app-table>

import {
  Component, Input, Output, EventEmitter, Directive, TemplateRef,
  ContentChildren, QueryList, AfterContentInit,
  computed, signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PaginationComponent } from '../pagination/pagination.component';

export interface TableColumn<T = any> {
  id: string;
  header: string;
  accessor?: (row: T) => any;   // valeur brute (tri / filtre / export). Défaut : row[id]
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;         // défaut true
  width?: string;
  align?: 'left' | 'center' | 'right';
  headerBg?: string;    // fond mis en valeur pour l'en-tête (ex: colonne "Restant")
  headerColor?: string;
}

// ── Directive : rendu custom d'une colonne, projeté par le parent ─────────
@Directive({ selector: 'ng-template[cellDef]', standalone: true })
export class CellDefDirective {
  @Input('cellDef') columnId!: string;
  constructor(public template: TemplateRef<any>) {}
}

type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [NgTemplateOutlet, PaginationComponent],
  template: `
@if (isGlobalFilter || isExport) {
  <div class="border-bottom pb-2 mb-2 d-flex flex-wrap align-items-center gap-2">
    @if (isGlobalFilter) {
      <input type="text" class="form-control form-control-sm" style="max-width:260px"
             [value]="globalFilterInput"
             (input)="onGlobalFilterInput($event)"
             [placeholder]="searchPlaceholder">
      <span class="text-muted small">
        @if (isFiltered()) {
          <span class="fw-semibold text-danger">{{ filteredSorted().length }}</span> / {{ data.length }} résultat(s)
        } @else {
          <span class="fw-semibold">{{ data.length }}</span> résultat(s)
        }
      </span>
    }
    @if (isExport) {
      <div class="ms-auto d-flex gap-2">
        <button type="button" class="btn btn-outline-success btn-sm" (click)="exportExcel()">Excel</button>
        <button type="button" class="btn btn-outline-danger btn-sm" (click)="exportPdf()">PDF</button>
      </div>
    }
  </div>
}

<div [class]="divClass">
  <table [class]="tableClass + (isBordered ? ' table-bordered' : '')">
    <thead [class]="theadClass">
      <tr [class]="trClass">
        @if (selectable) {
          <th style="width:36px">
            <input type="checkbox" class="form-check-input"
                   [checked]="allSelectedOnPage()"
                   (change)="toggleSelectAllOnPage($event)">
          </th>
        }
        @for (col of columns; track col.id) {
          <th [class]="thClass"
              [style.width]="col.width"
              [style.text-align]="col.align ?? 'left'"
              [style.cursor]="col.sortable ? 'pointer' : 'default'"
              [style.background]="col.headerBg"
              [style.color]="col.headerColor"
              (click)="col.sortable && toggleSort(col)">
            {{ col.header }}
            @if (col.sortable) {
              <span class="ms-1 text-muted small">{{ sortIndicator(col) }}</span>
            }
            @if (col.filterable) {
              <div class="mt-1" (click)="$event.stopPropagation()">
                <input type="text" class="form-control form-control-sm"
                       [value]="columnFilters()[col.id] ?? ''"
                       (input)="onColumnFilterInput(col.id, $event)"
                       placeholder="Filtrer...">
              </div>
            }
          </th>
        }
      </tr>
    </thead>

    <tbody>
      @if (paged().length === 0) {
        <tr>
          <td [attr.colspan]="columns.length + (selectable ? 1 : 0)" class="text-center text-muted py-5">
            {{ emptyMessage }}
          </td>
        </tr>
      } @else {
        @for (row of paged(); track trackByFn(row)) {
          <tr [class]="trClass + (isSelected(row) ? ' ' + selectedRowClass : '')">
            @if (selectable) {
              <td>
                <input type="checkbox" class="form-check-input"
                       [checked]="isSelected(row)"
                       (change)="toggleSelect(row)">
              </td>
            }
            @for (col of columns; track col.id) {
              <td [style.text-align]="col.align ?? 'left'">
                @if (cellTemplates()[col.id]) {
                  <ng-container [ngTemplateOutlet]="cellTemplates()[col.id]!"
                                [ngTemplateOutletContext]="{ $implicit: row }" />
                } @else {
                  {{ valueOf(row, col) }}
                }
              </td>
            }
          </tr>
        }
      }
    </tbody>
  </table>
</div>

@if (filteredSorted().length > 0) {
  <app-pagination
    [total]="filteredSorted().length"
    [pageSize]="pageSize"
    (pageChange)="onPageChange($event)" />
}
  `,
})
export class TableComponent<T = any> implements  AfterContentInit {
  @Input({ required: true }) columns: TableColumn<T>[] = [];
    // au lieu de : @Input({ required: true }) data: T[] = [];
  private dataSignal = signal<T[]>([]);

  @Input({ required: true })
  set data(v: T[]) {
    this.dataSignal.set(v ?? []);
    this.range.set({ debut: 0, fin: this.pageSize }); // reset pagination au changement de data
  }
  get data(): T[] {
    return this.dataSignal();
  }

  @Input() isGlobalFilter =false;
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() isExport = false;
  @Input() exportFilename = 'export';

  @Input() pageSize = 10;
  @Input() emptyMessage = 'Aucun résultat';
  @Input() trackByFn: (row: T) => unknown = (row) => row;

  @Input() selectable = false;
  @Input() selectedRowClass = 'table-active';
  @Input() rowIdFn: (row: T) => unknown = (row) => row;
  @Output() selectionChange = new EventEmitter<T[]>();

  @Input() tableClass = 'table table-hover align-middle mb-0';
  @Input() theadClass = 'table-light';
  @Input() trClass = '';
  @Input() thClass = '';
  @Input() divClass = 'table-responsive border rounded';
  @Input() isBordered = false;

  @ContentChildren(CellDefDirective) private cellDefsQuery!: QueryList<CellDefDirective>;
  cellTemplates = signal<Record<string, TemplateRef<any> | undefined>>({});

  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsQuery.changes.subscribe(() => this.rebuildCellTemplates());
  }
  private rebuildCellTemplates(): void {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellDefsQuery.forEach(cd => map[cd.columnId] = cd.template);
    this.cellTemplates.set(map);
  }

  // ── état ─────────────────────────────────────────────────────
  globalFilterInput = '';
  private globalFilter = signal('');
  private globalFilterDebounce?: ReturnType<typeof setTimeout>;

  columnFilters = signal<Record<string, string>>({});
  private columnFilterDebounce: Record<string, ReturnType<typeof setTimeout>> = {};

  private sortState = signal<{ colId: string; dir: SortDir } | null>(null);
  private selectedIds = signal<Set<unknown>>(new Set());
  private range = signal({ debut: 0, fin: this.pageSize });


  // ── recherche globale ───────────────────────────────────────
  onGlobalFilterInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.globalFilterInput = v;
    clearTimeout(this.globalFilterDebounce);
    this.globalFilterDebounce = setTimeout(() => this.globalFilter.set(v), 300);
  }

  // ── filtre par colonne ───────────────────────────────────────
  onColumnFilterInput(colId: string, e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    clearTimeout(this.columnFilterDebounce[colId]);
    this.columnFilterDebounce[colId] = setTimeout(() => {
      this.columnFilters.update(f => ({ ...f, [colId]: v }));
    }, 300);
  }

  // ── tri ──────────────────────────────────────────────────────
  toggleSort(col: TableColumn<T>): void {
    const cur = this.sortState();
    if (!cur || cur.colId !== col.id) this.sortState.set({ colId: col.id, dir: 'asc' });
    else if (cur.dir === 'asc') this.sortState.set({ colId: col.id, dir: 'desc' });
    else this.sortState.set(null);
  }
  sortIndicator(col: TableColumn<T>): string {
    const s = this.sortState();
    if (!s || s.colId !== col.id) return '↕';
    return s.dir === 'asc' ? '↑' : '↓';
  }

  valueOf(row: T, col: TableColumn<T>): any {
    return col.accessor ? col.accessor(row) : (row as any)[col.id];
  }

  // ── pipeline filtre + tri ──────────────────────────────────────
  filteredSorted = computed(() => {
    const gf = this.globalFilter().trim().toLowerCase();
    const cf = this.columnFilters();
    const sort = this.sortState();

    console.log('chargement du filtre',gf,cf,sort)
    let rows = this.dataSignal();

    if (gf) {
      rows = rows.filter(row =>
        this.columns.some(col => String(this.valueOf(row, col) ?? '').toLowerCase().includes(gf))
      );
    }

    for (const col of this.columns) {
      const v = cf[col.id]?.trim().toLowerCase();
      if (v) rows = rows.filter(row => String(this.valueOf(row, col) ?? '').toLowerCase().includes(v));
    }

    if (sort) {
      const col = this.columns.find(c => c.id === sort.colId);
      if (col) {
        rows = [...rows].sort((a, b) => {
          const av = this.valueOf(a, col), bv = this.valueOf(b, col);
          const cmp = av > bv ? 1 : av < bv ? -1 : 0;
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return rows;
  });

  isFiltered = computed(() => this.filteredSorted().length !== this.data.length);
  paged = computed(() => this.filteredSorted().slice(this.range().debut, this.range().fin));
  onPageChange(r: { debut: number; fin: number }): void { this.range.set(r); }

  // ── sélection ────────────────────────────────────────────────
  isSelected(row: T): boolean { return this.selectedIds().has(this.rowIdFn(row)); }
  toggleSelect(row: T): void {
    const id = this.rowIdFn(row);
    this.selectedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    this.emitSelection();
  }
  allSelectedOnPage = computed(() =>
    this.paged().length > 0 && this.paged().every(r => this.isSelected(r))
  );
  toggleSelectAllOnPage(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selectedIds.update(s => {
      const next = new Set(s);
      for (const row of this.paged()) checked ? next.add(this.rowIdFn(row)) : next.delete(this.rowIdFn(row));
      return next;
    });
    this.emitSelection();
  }
  private emitSelection(): void {
    const ids = this.selectedIds();
    this.selectionChange.emit(this.data.filter(r => ids.has(this.rowIdFn(r))));
  }

  // ── export ───────────────────────────────────────────────────
  exportExcel(): void {
    const rows = this.filteredSorted();
    const cols = this.columns.filter(c => c.exportable !== false);
    const exportData = rows.map(row => Object.fromEntries(cols.map(c => [c.header, this.valueOf(row, c) ?? ''])));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, `${this.exportFilename}.xlsx`);
  }

  exportPdf(): void {
    const rows = this.filteredSorted();
    const cols = this.columns.filter(c => c.exportable !== false);
    const doc = new jsPDF();
    doc.setFontSize(13);
    doc.text(this.exportFilename, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [cols.map(c => c.header)],
      body: rows.map(row => cols.map(c => String(this.valueOf(row, c) ?? '—'))),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 95, 165] },
    });
    doc.save(`${this.exportFilename}.pdf`);
  }
}