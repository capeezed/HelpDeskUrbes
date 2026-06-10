import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  standalone: false,
  templateUrl: './esqueci-senha.html',
  styleUrls: ['./esqueci-senha.css']
})
export class EsqueciSenha {

  email = '';
  mensagem = '';
  erro = '';
  isLoading = false;

  constructor(
    private authService: AuthService
  ) {}

  enviarLink() {

    this.mensagem = '';
    this.erro = '';
    this.isLoading = true;

    this.authService.esqueciSenha(this.email).subscribe({

      next: () => {

        this.isLoading = false;

        this.mensagem =
          'Se o email existir, enviaremos um link de recuperação.';
      },

      error: () => {

        this.isLoading = false;

        this.erro =
          'Erro ao enviar solicitação.';
      }
    });
  }
}
