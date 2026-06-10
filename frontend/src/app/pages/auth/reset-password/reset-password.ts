
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: false,
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPassword implements OnInit {

  token = '';

  password = '';
  confirmPassword = '';

  mensagem = '';
  erro = '';

  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.token =
      this.route.snapshot.paramMap.get('token') || '';
  }

  salvarSenha() {

    this.mensagem = '';
    this.erro = '';

    if (this.password !== this.confirmPassword) {

      this.erro =
        'As senhas não coincidem.';

      return;
    }

    this.isLoading = true;

    this.authService
      .resetarSenha(this.token, this.password)
      .subscribe({

        next: () => {

          this.isLoading = false;

          this.mensagem =
            'Senha alterada com sucesso!';

          setTimeout(() => {

            this.router.navigate(['/login']);

          }, 2000);
        },

        error: (err) => {

          this.isLoading = false;

          this.erro =
            err.error?.message ||
            'Erro ao alterar senha.';
        }
      });
  }
}
