import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, CadastroData } from '../../../services/auth.service';

@Component({
  selector: 'app-cadastro',
  standalone: false,
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.css']
})
export class Cadastro {

  // Variáveis do formulário
  nomeCompleto = '';
  email = '';
  password = '';
  confirmPassword = '';
  
  // Novos campos de texto
  setor = '';
  cargo = '';

  // Mensagens e Estado de Carregamento
  mensagemErro = '';
  mensagemSucesso = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
    // Não precisamos mais do DadosGerais!
  ) { }

  // Não precisamos de ngOnInit, carregarDadosDropdowns, ou onSetorChange!

  /**
   * handleCadastro (SIMPLIFICADO)
   */
  async handleCadastro() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.isLoading = true;

    // --- Validações ---
    if (this.password !== this.confirmPassword) {
      this.mensagemErro = 'As senhas não coincidem.';
      this.isLoading = false;
      return;
    }
    // Validação simples de campos de texto
    if (!this.email || !this.nomeCompleto || !this.setor || !this.cargo) {
       this.mensagemErro = 'Por favor, preencha todos os campos.';
       this.isLoading = false;
       return;
    }
    // --- Fim Validações ---
    
    // Os dados para enviar (agora com strings)
    const dados: CadastroData = {
      email: this.email,
      pass: this.password,
      nomeCompleto: this.nomeCompleto,
      setor: this.setor,
      cargo: this.cargo
    };

    this.authService.cadastrarUsuario(dados).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Conta criada com sucesso! Redirecionando para o login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.mensagemErro = err.error?.message || 'Erro desconhecido ao cadastrar.';
        console.error(err);
      }
    });
  }
}