// loading-spinner.component.ts
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="d-flex justify-content-center align-items-center py-5">
      <mat-spinner diameter="48"></mat-spinner>
    </div>
  `
})
export class LoadingSpinnerComponent {}
