import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TecnicoGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // Usamos nosso novo helper 'ehTecnico'
    if (this.authService.ehTecnico) {
      return true; // Acesso permitido
    } else {
      // Se não for técnico, chuta ele para o dashboard de funcionário
      console.log('TecnicoGuard: Acesso negado. Redirecionando...');
      return this.router.createUrlTree(['/dashboard']);
    }
  }
}