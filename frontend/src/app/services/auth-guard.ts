import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router'; // CanActivate e Router
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';   // Nosso AuthService
import { map, tap } from 'rxjs/operators';      // Operadores do RxJS

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  // 1. Injete o AuthService (para saber o status) e o Router (para redirecionar)
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    
    // 2. Ouve o Observable de usuário do nosso AuthService
    return this.authService.user$.pipe(
      
      // 3. Transforma o valor (User | null) em um booleano (true | false)
      // !!user = true (se for um objeto User)
      // !!null = false (se for nulo)
      map(user => !!user), 
      
      // 4. "Efeito colateral": verifica o resultado do map
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          // 5. Se não estiver logado (isLoggedIn === false)...
          console.log('AuthGuard: Acesso negado, redirecionando para /login');
          // Redireciona para a página de login
          this.router.navigate(['/login']);
        }
      })
    );
  }
}