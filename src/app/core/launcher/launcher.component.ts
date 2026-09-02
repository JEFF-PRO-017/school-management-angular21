// core/launcher/launcher.component.ts — seul point d'entrée "/"
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../services/@session/session.service';

@Component({ selector: 'app-launcher', standalone: true, template: '' })
export class LauncherComponent implements OnInit {
    private sessionService = inject(SessionService);
    private router = inject(Router);

    ngOnInit(): void {
        debugger
        const session = this.sessionService.get(); // lu depuis le token stocké
        if (session && session.id_user) this.router.navigate(['/admin']);
        else if (session && session.id_famille) this.router.navigate(['/espace-parent']);
        else this.router.navigate(['/espace-parent/login']); // défaut : public parent
    }
}