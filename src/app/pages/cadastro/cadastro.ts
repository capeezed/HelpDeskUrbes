import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// 1. Importa a interface CadastroData do AuthService
import { AuthService, CadastroData } from '../../services/auth.service';
// 2. Importa os serviços e interfaces de DadosGerais
import { DadosGerais, Setor, Cargo } from '../../services/dados-gerais';

@Component({
  selector: 'app-cadastro',
  standalone: false,
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.css']
})
export class Cadastro implements OnInit {

  // Variáveis do formulário
  nomeCompleto = '';
  email = '';
  password = '';
  confirmPassword = '';

  // IDs dos dropdowns
  setorSelecionadoId: number | null = null;
  cargoSelecionadoId: number | null = null;

  // Listas dos dropdowns
  listaDeSetores: Setor[] = [];
  listaDeCargosCompleta: Cargo[] = [];
  listaDeCargosFiltrada: Cargo[] = [];

  // Mensagens e Estado de Carregamento
  mensagemErro = '';
  mensagemSucesso = '';
  isLoadingDados = true;   // Loading dos dropdowns
  isLoading = false;       // <-- ADICIONADO: Loading do botão de submit

  constructor(
    private authService: AuthService,
    private router: Router,
    private DadosGerais: DadosGerais // Nome do seu serviço
  ) { }

  ngOnInit(): void {
    this.carregarDadosDropdowns();
  }

  /**
   * 3. REFATORADO COM .subscribe()
   * Busca setores e, DEPOIS, busca os cargos.
   */
  carregarDadosDropdowns() {
    this.isLoadingDados = true;
    this.mensagemErro = ''; // Limpa erros antigos

    this.DadosGerais.getSetores().subscribe({
      next: (setores) => {
        this.listaDeSetores = setores;
        
        // Agora busca os cargos
        this.DadosGerais.getCargos().subscribe({
          next: (cargos) => {
            this.listaDeCargosCompleta = cargos;
            this.isLoadingDados = false; // <-- Termina o loading SÓ AQUI
          },
          error: (err) => this.handleApiError(err, 'cargos')
        });
      },
      error: (err) => this.handleApiError(err, 'setores')
    });
  }

  // Helper para tratar erros do carregamento de dados
  private handleApiError(err: any, context: string) {
    this.isLoadingDados = false;
    this.isLoading = false;
    this.mensagemErro = `Erro ao carregar ${context}: ${err.message}`;
    console.error(err);
  }

  /**
   * 4. Função onSetorChange (Corrigida com `==` para comparar string/number)
   */
  onSetorChange(): void {
    this.cargoSelecionadoId = null; 
    
    if (this.setorSelecionadoId) {
      // Usamos '==' para o caso do ngModel retornar 'string'
      this.listaDeCargosFiltrada = this.listaDeCargosCompleta.filter(
        cargo => cargo.setor_id == this.setorSelecionadoId
      );
    } else {
      this.listaDeCargosFiltrada = [];
    }
  }


  /**
   * 5. REFATORADO COM .subscribe() e isLoading
   */
  async handleCadastro() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.isLoading = true; // <-- LIGA o loading do botão

    // --- Validações ---
    if (this.password !== this.confirmPassword) {
      this.mensagemErro = 'As senhas não coincidem.';
      this.isLoading = false;
      return;
    }
    if (this.password.length < 6) {
      this.mensagemErro = 'A senha deve ter pelo menos 6 caracteres.';
      this.isLoading = false;
      return;
    }
    if (!this.setorSelecionadoId || !this.cargoSelecionadoId) {
      this.mensagemErro = 'Por favor, selecione seu Setor e Cargo.';
      this.isLoading = false; 
      return;
    }
    // --- Fim Validações ---
    
    // Os dados para enviar (a interface está no AuthService)
    const dados: CadastroData = {
      email: this.email,
      pass: this.password,
      nomeCompleto: this.nomeCompleto,
      setorId: this.setorSelecionadoId,
      cargoId: this.cargoSelecionadoId
    };

    // Usamos .subscribe() para "ouvir" a resposta do HttpClient
    this.authService.cadastrarUsuario(dados).subscribe({
      // Callback de Sucesso
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Conta criada com sucesso! Redirecionando para o login...';
        
        // Redireciona após 3 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      // Callback de Erro
      error: (err) => {
        this.isLoading = false;
        // Pega a mensagem de erro do backend (ex: "Email já existe")
        this.mensagemErro = err.error?.message || err.message || 'Erro desconhecido ao cadastrar.';
        console.error(err);
      }
    });
  }
}

