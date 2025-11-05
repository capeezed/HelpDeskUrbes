import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service'; // O novo AuthService

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
  handleLogin() {
    this.isLoading = true;
    this.authService.loginComEmail(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // --- LÓGICA DE REDIRECIONAMENTO ---
        if (this.authService.ehTecnico) {
          this.router.navigate(['/admin/fila']); // Vai para a Fila de TI
        } else {
          this.router.navigate(['/dashboard']); // Vai para o Dashboard normal
        }
        
      },
      error: (err) => {
        // ... (seu código de erro)
      }
    });
  }
}