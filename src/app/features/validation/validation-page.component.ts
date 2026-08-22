import { Component, signal } from '@angular/core';
import { ElevesValidationComponent } from './components/eleves-validation.component';
import { FamillesValidationComponent } from './components/familles-validation.component';
import { MoratoiresValidationComponent } from './components/moratoires-validation.component';
import { PaiementsValidationComponent } from './components/paiements-validation.component';


type Onglet = 'familles' | 'eleves' | 'paiements' | 'moratoires';

@Component({
  selector: 'app-validation-page',
  standalone: true,
  imports: [FamillesValidationComponent, ElevesValidationComponent, MoratoiresValidationComponent, PaiementsValidationComponent],
  template: `
<div class="p-3">
  <ul class="nav nav-pills mb-3">
    <li class="nav-item">
      <button class="nav-link" [class.active]="onglet() === 'familles'" (click)="onglet.set('familles')">Familles</button>
    </li>
    <li class="nav-item">
      <button class="nav-link" [class.active]="onglet() === 'eleves'" (click)="onglet.set('eleves')">Élèves</button>
    </li>
    <li class="nav-item">
      <button class="nav-link" [class.active]="onglet() === 'paiements'" (click)="onglet.set('paiements')">Paiements</button>
    </li>
    <li class="nav-item">
      <button class="nav-link" [class.active]="onglet() === 'moratoires'" (click)="onglet.set('moratoires')">Moratoires</button>
    </li>
  </ul>

  @switch (onglet()) {
    @case ('familles')   { <app-familles-validation /> }
    @case ('eleves')     { <app-eleves-validation /> }
    @case ('paiements')  { <app-paiements-validation /> }
    @case ('moratoires') { <app-moratoires-validation /> }
  }
</div>
  `
})
export class ValidationPageComponent {
  onglet = signal<Onglet>('familles');
}