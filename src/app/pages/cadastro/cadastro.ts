import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, CadastroData } from '../../services/auth.service';
// 1. O nome do seu serviço (DadosGerais) e o nome do arquivo (dados-gerais)
//    estão um pouco diferentes do padrão (DadosGeraisService / dados-gerais.service),
//    mas estou mantendo como você importou!
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
  isLoadingDados = true;  // Loading dos dropdowns
  isLoading = false;      // <-- ADICIONADO: Loading do botão de submit

  constructor(
    private authService: AuthService,
    private router: Router,
    private DadosGerais: DadosGerais // Injetando seu serviço
  ) { }

  async ngOnInit(): Promise<void> {
    this.carregarDadosDropdowns();
  }

  /**
   * Busca setores e cargos do Supabase
   */
  async carregarDadosDropdowns() {
    this.isLoadingDados = true;
    try {
      const [setores, cargos] = await Promise.all([
        this.DadosGerais.getSetores(),
        this.DadosGerais.getCargos()
      ]);
      
      this.listaDeSetores = setores;
      this.listaDeCargosCompleta = cargos;

    } catch (error) {
      this.mensagemErro = 'Erro ao carregar dados de Setor/Cargo.';
      console.error(error);
    } finally {
      this.isLoadingDados = false;
    }
  }

  /**
   * Filtra os cargos quando o setor muda
   */
  onSetorChange(): void {
    this.cargoSelecionadoId = null; 
    
    if (this.setorSelecionadoId) {
      this.listaDeCargosFiltrada = this.listaDeCargosCompleta.filter(
        cargo => cargo.setor_id == this.setorSelecionadoId
      );
    } else {
      this.listaDeCargosFiltrada = [];
    }
  }


  /**
   * Função de Cadastro (handleCadastro) COMPLETA
   */
  async handleCadastro() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.isLoading = true; // <-- LIGA O "CARREGANDO"

    // --- Validações ---
    if (this.password !== this.confirmPassword) {
      this.mensagemErro = 'As senhas não coincidem.';
      this.isLoading = false; // <-- DESLIGA (erro)
      return;
    }
    if (this.password.length < 6) {
      this.mensagemErro = 'A senha deve ter pelo menos 6 caracteres.';
      this.isLoading = false; // <-- DESLIGA (erro)
      return;
    }
    if (!this.setorSelecionadoId || !this.cargoSelecionadoId) {
      this.mensagemErro = 'Por favor, selecione seu Setor e Cargo.';
      this.isLoading = false; // <-- DESLIGA (erro)
      return;
    }
    // --- Fim Validações ---

    try {
      // Cria o objeto de dados para enviar
      const dadosCadastro: CadastroData = {
        email: this.email,
        pass: this.password,
        nomeCompleto: this.nomeCompleto,
        setorId: this.setorSelecionadoId,
        cargoId: this.cargoSelecionadoId
      };
      
      const { data, error } = await this.authService.cadastrarUsuario(dadosCadastro);

      if (error) {
        // Erro vindo do Supabase
        console.error('Erro no cadastro:', error);
        this.mensagemErro = error.message;
      } else {
        // Sucesso!
        console.log('Usuário cadastrado:', data);
        this.mensagemSucesso = 'Conta criada com sucesso! Redirecionando para o login...';
        
        // Redireciona para o login após 3 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }

    } catch (err: any) {
      // Erro inesperado na lógica
      console.error('Erro inesperado no handleCadastro:', err);
      this.mensagemErro = 'Ocorreu um erro inesperado: ' + (err.message || err);
    } finally {
      // 'finally' é executado sempre, dando certo ou errado
      if (!this.mensagemSucesso) {
        // Só desliga o loading se não for sucesso (pois no sucesso, vamos redirecionar)
        this.isLoading = false; // <-- DESLIGA (erro/fim)
      }
    }
  }
}
