import { Component } from '@angular/core';
import { Router } from '@angular/router'; // 1. Importe o Router
import { AuthService } from '../../services/auth.service'; // 2. Importe o AuthService

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.css'] // Você pode adicionar CSS aqui
})
export class Login {

  // 3. Variáveis para guardar os dados do formulário
  email = '';
  password = '';
  mensagemErro = '';

  // 4. Injete o AuthService e o Router no construtor
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * Função chamada pelo formulário (ngSubmit)
   */
  async handleLogin() {
    try {
      this.mensagemErro = ''; // Limpa erros antigos

      // 5. Chama o serviço de autenticação
      const { data, error } = await this.authService.loginComEmail(
        this.email,
        this.password
      );

      if (error) {
        // 6. Se deu erro, mostra a mensagem
        console.error('Erro no login:', error);
        this.mensagemErro = 'Email ou senha inválidos.'; // Mensagem amigável
      } else {
        // 7. Se deu certo, redireciona para o Dashboard
        console.log('Login com sucesso:', data);
        this.router.navigate(['/dashboard']); // <-- Mude para sua rota principal
      }
      
    } catch (error) {
      console.error('Erro inesperado:', error);
      this.mensagemErro = 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}