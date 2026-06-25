// shared/pagination.component.ts — réutilisable sur tous les tableaux
import { Component, Input, Output, EventEmitter, computed, signal, OnChanges } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
@if (totalPages() > 1) {
  <div class="d-flex align-items-center justify-content-between mt-2 px-1">
    <span class="text-muted" style="font-size:11px">
      {{ debut() + 1 }}–{{ fin() }} sur {{ total }}
    </span>
    <div class="d-flex align-items-center gap-1">
      <button class="btn btn-sm btn-outline-secondary px-2 py-0"
              [disabled]="page() === 1" (click)="aller(1)">«</button>
      <button class="btn btn-sm btn-outline-secondary px-2 py-0"
              [disabled]="page() === 1" (click)="aller(page() - 1)">‹</button>

      @for (p of pages(); track p) {
        <button class="btn btn-sm px-2 py-0"
                [class.btn-primary]="p === page()"
                [class.btn-outline-secondary]="p !== page()"
                (click)="aller(p)">{{ p }}</button>
      }

      <button class="btn btn-sm btn-outline-secondary px-2 py-0"
              [disabled]="page() === totalPages()" (click)="aller(page() + 1)">›</button>
      <button class="btn btn-sm btn-outline-secondary px-2 py-0"
              [disabled]="page() === totalPages()" (click)="aller(totalPages())">»</button>
    </div>
  </div>
}
  `
})
export class PaginationComponent implements OnChanges {
  @Input() total    = 0;
  @Input() pageSize = 10;
  @Output() pageChange = new EventEmitter<{ debut: number; fin: number }>();

  page       = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total / this.pageSize)));
  debut      = computed(() => (this.page() - 1) * this.pageSize);
  fin        = computed(() => Math.min(this.total, this.page() * this.pageSize));

  pages = computed(() => {
    const t = this.totalPages(), p = this.page();
    const range = (a: number, b: number) =>
      Array.from({ length: b - a + 1 }, (_, i) => a + i);
    if (t <= 5) return range(1, t);
    if (p <= 3) return range(1, 5);
    if (p >= t - 2) return range(t - 4, t);
    return range(p - 2, p + 2);
  });

  ngOnChanges(): void { this.page.set(1); this.emit(); }

  aller(p: number): void {
    this.page.set(p);
    this.emit();
  }

  private emit(): void {
    this.pageChange.emit({ debut: this.debut(), fin: this.fin() });
  }
}