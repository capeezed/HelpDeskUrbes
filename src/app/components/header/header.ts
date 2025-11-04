import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // 1. Importe o AuthService

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {

  // 2. Injete o AuthService e o Router
  //    Tornamos o authService 'public' para que o HTML possa acessá-lo
  constructor(
    public authService: AuthService, 
    private router: Router
  ) { }

  /**
   * 3. Função de Logout
   */
  async logout() {
    try {
      // Chama o método de logout do nosso serviço
      await this.authService.logout();
      
      // Após o logout, manda o usuário de volta para a tela de login
      this.router.navigate(['/login']);

    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }
}