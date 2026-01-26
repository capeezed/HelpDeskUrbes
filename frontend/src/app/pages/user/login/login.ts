import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AvisoService, Aviso } from '../../../services/aviso-service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  email = '';
  password = '';
  mensagemErro = '';
  isLoading = false;

  avisos: Aviso[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private avisoService: AvisoService
  ) { }

  ngOnInit(): void {
    this.carregarAvisos();
  }

  carregarAvisos() {
    this.avisoService.listarPublicos().subscribe({
      next: res => this.avisos = res,
      error: () => this.avisos = []
    });
  }

  handleLogin() {
    this.mensagemErro = '';
    this.isLoading = true;

    this.authService.loginComEmail(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        if (this.authService.ehTecnico) {
          this.router.navigate(['/admin/fila']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.mensagemErro = 'Email ou senha incorretos.';
        } else if (err.status === 0) {
          this.mensagemErro = 'Erro de conexão.';
        } else {
          this.mensagemErro = 'Erro ao fazer login.';
        }
      }
    });
  }
}
