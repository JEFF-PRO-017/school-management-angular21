import { Routes } from "@angular/router";
import { adminGuard, permGuard } from "../../core/guards/auth.guard";

export const ADMINISTRATION_ROUTES: Routes = [
    // { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    // Référentiels — admin uniquement
    {
        path: 'familles',
        canActivate: [permGuard],
        data: { perm: 'familles' },
        loadChildren: () => import('./familles/familles.routes').then(m => m.FAMILLES_ROUTES),
    },
    {
        path: 'eleves',
        canActivate: [permGuard],
        data: { perm: 'eleves' },
        loadChildren: () => import('./eleves/eleves.routes').then(m => m.ELEVES_ROUTES)
    },
    {
        path: 'classes',
        canActivate: [permGuard],
        data: { perm: 'classes' },
        loadChildren: () => import('./classes/classes.routes').then(m => m.CLASSES_ROUTES),
    },
    {
        path: 'insolvables',
        canActivate: [permGuard],
        data: { perm: 'insolvables' },
        loadChildren: () => import('./insolvables/insolvables.routes').then(m => m.INSOLVABLES_ROUTES),
    },
    {
        path: 'matieres',
        canActivate: [permGuard],
        data: { perm: 'matieres' },
        loadChildren: () => import('./matieres/matieres.routes').then(m => m.MATIERES_ROUTES),
    },

    // Pédagogie
    {
        path: 'notes',
        canActivate: [permGuard],
        data: { perm: 'notes' },
        loadChildren: () => import('./notes/notes.routes').then(m => m.NOTES_ROUTES),
    },

    // Absences
    {
        path: 'absences',
        canActivate: [permGuard],
        data: { perm: 'absences' },
        loadChildren: () => import('./absences/absences.routes').then(m => m.ABSENCES_ROUTES),
    },
    {
        path: 'paiement',
        canActivate: [permGuard],
        data: { perm: 'paiement' },
        loadChildren: () => import('./paiements/paiement.routes').then(r => r.PAIEMENT_ROUTES)
    },
    // WhatsApp
    {
        path: 'whatsapp',
        canActivate: [permGuard],
        data: { perm: 'whatsapp' },
        loadChildren: () => import('./whatsapp/whatsapp.routes').then(m => m.WHATSAPP_ROUTES),
    },

    // Gestion utilisateurs — admin uniquement
    {
        path: 'users',
        canActivate: [adminGuard],
        loadChildren: () => import('./users/users.routes').then(m => m.USERS_ROUTES),
    },
    // ── Espace consultant (guard staff) ─────────────────────────
    {
        path: 'consultant',
        canActivate: [permGuard],
        data: { perm: 'validation_parents' },
        loadComponent: () => import('./validation/validation-page.component').then(m => m.ValidationPageComponent),
    },

]