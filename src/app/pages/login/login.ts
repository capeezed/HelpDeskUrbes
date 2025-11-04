import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // O novo AuthService

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {

  // Variáveis para o formulário
  email = '';
  password = '';
  mensagemErro = '';
  
  // 1. ADICIONAMOS A VARIÁVEL 'isLoading'
  isLoading = false; 

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * 2. Função de login REFATORADA para .subscribe()
   */
  handleLogin() { // Não é mais 'async'
    this.mensagemErro = '';
    this.isLoading = true; // 3. LIGA o "carregando"

    this.authService.loginComEmail(this.email, this.password).subscribe({
      
      // Callback de Sucesso
      next: (response) => {
        this.isLoading = false; // 4. DESLIGA o "carregando"
        // O AuthService já salvou o token e atualizou o user$
        // Apenas redirecionamos para o dashboard
        this.router.navigate(['/dashboard']);
      },
      
      // Callback de Erro
      error: (err) => {
        this.isLoading = false; // 5. DESLIGA o "carregando"
        // O backend (server.js) envia a mensagem de erro
        this.mensagemErro = err.error?.message || 'Email ou senha inválidos.';
        console.error(err);
      }
    });
  }
}