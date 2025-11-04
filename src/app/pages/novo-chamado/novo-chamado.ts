import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// 1. MUDANÇA AQUI: Importamos 'NovoChamado' como 'NovoChamadoData' para evitar conflito
import { ChamadoService, NovoChamado as NovoChamadoData } from '../../services/chamado';
import { DadosGerais, Categoria } from '../../services/dados-gerais';

@Component({
  selector: 'app-novo-chamado',
  standalone: false,
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
// O nome da sua classe é 'NovoChamado'
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

  carregarCategorias() {
    this.isLoadingDados = true;
    this.dadosGeraisService.getCategorias().subscribe({
      next: (categorias) => {
        this.listaDeCategorias = categorias;
        this.isLoadingDados = false;
      },
      error: (err) => {
        this.isLoadingDados = false;
        this.mensagemErro = 'Falha ao carregar categorias.';
        console.error(err);
      }
    });
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

    // 2. MUDANÇA AQUI: Usamos o apelido 'NovoChamadoData'
    const novoChamado: NovoChamadoData = {
      titulo: this.titulo,
      descricao: this.descricao,
      categoria_id: this.categoriaId,
      prioridade: this.prioridade
    };

    this.chamadoService.criarChamado(novoChamado).subscribe({
      next: (response) => {
        this.isLoading = false;
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

      },
      error: (err) => {
        this.isLoading = false;
        this.mensagemErro = err.error?.message || 'Erro ao abrir chamado.';
        console.error(err);
      }
    });
  }
}

