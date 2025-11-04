import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChamadoService } from '../../services/chamado';
import { DadosGerais, Categoria } from '../../services/dados-gerais';

@Component({
  selector: 'app-novo-chamado',
  standalone: false,
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
export class NovoChamado implements OnInit {

  // Variáveis do Formulário
  titulo = '';
  categoriaId: number | null = null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente' = 'baixa'; // Valor padrão
  descricao = '';

  // Estado da Página
  listaDeCategorias: Categoria[] = [];
  isLoadingDados = true;
  isLoading = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private dadosGeraisService: DadosGerais,
    private chamadoService: ChamadoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Busca as categorias assim que a página carrega
    this.carregarCategorias();
  }

  async carregarCategorias() {
    this.isLoadingDados = true;
    try {
      this.listaDeCategorias = await this.dadosGeraisService.getCategorias();
    } catch (error) {
      this.mensagemErro = 'Falha ao carregar categorias.';
    } finally {
      this.isLoadingDados = false;
    }
  }

  async handleNovoChamado() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    
    // Validação
    if (!this.titulo || !this.categoriaId || !this.descricao) {
      this.mensagemErro = 'Por favor, preencha todos os campos obrigatórios.';
      return;
    }

    this.isLoading = true;

    try {
      // Chama o serviço para criar o chamado
      await this.chamadoService.criarChamado({
        titulo: this.titulo,
        descricao: this.descricao,
        categoria_id: this.categoriaId,
        prioridade: this.prioridade
      });

      // Sucesso!
      this.mensagemSucesso = 'Chamado aberto com sucesso! Redirecionando...';
      
      // Limpa o formulário (opcional)
      this.titulo = '';
      this.categoriaId = null;
      this.prioridade = 'baixa';
      this.descricao = '';

      // Redireciona de volta para o Dashboard após 2 segundos
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);

    } catch (error: any) {
      this.mensagemErro = 'Erro ao abrir chamado: ' + error.message;
    } finally {
      this.isLoading = false;
    }
  }
}
