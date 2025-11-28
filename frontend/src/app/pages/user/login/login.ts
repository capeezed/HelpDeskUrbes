import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {

  email = '';
  password = '';
  mensagemErro = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  handleLogin() {
    // Limpa mensagem de erro anterior
    this.mensagemErro = '';
    this.isLoading = true;

    this.authService.loginComEmail(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Redireciona conforme o tipo de usuário
        if (this.authService.ehTecnico) {
          this.router.navigate(['/admin/fila']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        
        // Tratamento de erros específicos
        if (err.status === 401) {
          this.mensagemErro = 'Email ou senha incorretos. Tente novamente.';
        } else if (err.status === 0) {
          this.mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (err.status === 500) {
          this.mensagemErro = 'Erro no servidor. Contate o suporte.';
        } else {
          this.mensagemErro = 'Erro ao fazer login. Tente novamente mais tarde.';
        }
        
        console.error('Erro no login:', err);
      }
    });
  }
}
