import { Component, OnInit } from '@angular/core'; // Adicione OnInit
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// 1. Importe o novo serviço e as interfaces
import { DadosGerais, Setor, Cargo } from '../../services/dados-gerais';

@Component({
  selector: 'app-cadastro',
  standalone: false,
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.css']
})
export class Cadastro implements OnInit { // Implemente OnInit

  // Variáveis do formulário
  nomeCompleto = '';
  email = '';
  password = '';
  confirmPassword = '';

  // 2. Mude setor e cargo para IDs (números)
  //    (null significa "nenhum selecionado")
  setorSelecionadoId: number | null = null;
  cargoSelecionadoId: number | null = null;

  // 3. Listas para os dropdowns
  listaDeSetores: Setor[] = [];
  listaDeCargosCompleta: Cargo[] = []; // Todos os cargos do banco
  listaDeCargosFiltrada: Cargo[] = []; // Só os cargos do setor selecionado

  // Mensagens
  mensagemErro = '';
  mensagemSucesso = '';
  isLoadingDados = true; // Para mostrar um "loading"

  constructor(
    private authService: AuthService,
    private router: Router,
    private DadosGerais: DadosGerais // 4. Injete o novo serviço
  ) { }

  // 5. ngOnInit é chamado quando o componente carrega
  async ngOnInit(): Promise<void> {
    this.carregarDadosDropdowns();
  }

  /**
   * Busca setores e cargos do Supabase
   */
  async carregarDadosDropdowns() {
    this.isLoadingDados = true;
    try {
      // Promise.all executa as buscas em paralelo
      const [setores, cargos] = await Promise.all([
        this.DadosGerais.getSetores(),
        this.DadosGerais.getCargos()
      ]);
      
      this.listaDeSetores = setores;
      this.listaDeCargosCompleta = cargos;

    } catch (error) {
      this.mensagemErro = 'Erro ao carregar dados de Setor/Cargo.';
    } finally {
      this.isLoadingDados = false;
    }
  }

  /**
   * 6. Função mágica! Chamada quando o usuário MUDA o setor.
   */
  onSetorChange(): void {
    // Limpa o cargo antigo
    this.cargoSelecionadoId = null; 
    
    if (this.setorSelecionadoId) {
      // Filtra a lista completa de cargos
      this.listaDeCargosFiltrada = this.listaDeCargosCompleta.filter(
        cargo => cargo.setor_id == this.setorSelecionadoId
      );
    } else {
      // Se nenhum setor está selecionado, a lista de cargos fica vazia
      this.listaDeCargosFiltrada = [];
    }
  }


  /**
   * 7. Atualizar o handleCadastro para enviar os IDs
   */
  async handleCadastro() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    // Validações
    if (this.password !== this.confirmPassword) { /* ... */ }
    if (this.password.length < 6) { /* ... */ }
    
    // 8. Validação dos dropdowns
    if (!this.setorSelecionadoId || !this.cargoSelecionadoId) {
      this.mensagemErro = 'Por favor, selecione seu Setor e Cargo.';
      return;
    }

    try {
      // ATENÇÃO: Você precisa atualizar seu AuthService para receber os IDs
      // (Vou assumir que você já fez isso, como no meu exemplo anterior)
      const { data, error } = await this.authService.cadastrarUsuario({
        email: this.email,
        pass: this.password,
        nomeCompleto: this.nomeCompleto,
        setorId: this.setorSelecionadoId, // Enviando o ID
        cargoId: this.cargoSelecionadoId  // Enviando o ID
      });

      if (error) { /* ... */ } else { /* ... */ }
    } catch (err) { /* ... */ }
  }
}