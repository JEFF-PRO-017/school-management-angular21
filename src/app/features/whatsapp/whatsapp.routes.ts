// whatsapp.routes.ts
import { Routes } from '@angular/router';

export const WHATSAPP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./templates-list/templates-list.component').then(m => m.TemplatesListComponent),
  },
  {
    path: 'templates/nouveau',
    loadComponent: () =>
      import('./template-form/template-form.component').then(m => m.TemplateFormComponent),
  },
  {
    path: 'templates/:id/modifier',
    loadComponent: () =>
      import('./template-form/template-form.component').then(m => m.TemplateFormComponent),
  },
  {
    path: 'alertes',
    loadComponent: () =>
      import('./alertes-log/alertes-log.component').then(m => m.AlertesLogComponent),
  },
];
