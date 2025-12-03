import { Component, OnInit } from '@angular/core';
import { EstoqueService, ItemEstoque } from '../../../services/estoque';

@Component({
  selector: 'app-estoque',
  standalone: false,
  templateUrl: './estoque.html',
  styleUrls: ['./estoque.css']
})
export class Estoque implements OnInit {

  itens: ItemEstoque[] = [];
  isLoading = false;
  mensagemErro = '';

  // filtros
  busca = '';
  mostrarApenasCriticos = false;

  // resumo
  totalItens = 0;
  itensCriticos = 0;

  // movimentação
  itemSelecionado: ItemEstoque | null = null;
  tipoMov: 'entrada' | 'saida' = 'entrada';
  quantidade = 1;
  observacao = '';
  mostrandoModalMov = false;

  // novo item
  novoItem = {
    nome: '',
    categoria: '',
    descricao: '',
    quantidade_inicial: 0,
    quantidade_minima: 0,
    localizacao: ''
  };
  mostrandoModalNovo = false;
  salvandoNovo = false;

  constructor(private estoqueService: EstoqueService) {}

  ngOnInit(): void {
    this.carregarItens();
  }

  carregarItens() {
    this.isLoading = true;
    this.mensagemErro = '';

    this.estoqueService.listarItens().subscribe({
      next: (res) => {
        this.itens = res;
        this.isLoading = false;
        this.atualizarResumo();
      },
      error: (err) => {
        console.error('Erro ao carregar estoque:', err);
        this.mensagemErro = 'Erro ao carregar itens de estoque.';
        this.isLoading = false;
      }
    });
  }

  atualizarResumo() {
    this.totalItens = this.itens.length;
    this.itensCriticos = this.itens.filter(
      i => i.quantidade_atual <= i.quantidade_minima
    ).length;
  }

  // lista filtrada usada no *ngFor
  get itensFiltrados(): ItemEstoque[] {
    return this.itens
      .filter(i => {
        if (this.mostrarApenasCriticos && i.quantidade_atual > i.quantidade_minima) {
          return false;
        }
        if (!this.busca.trim()) return true;
        const termo = this.busca.toLowerCase();
        return (
          i.nome.toLowerCase().includes(termo) ||
          (i.categoria || '').toLowerCase().includes(termo) ||
          (i.localizacao || '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  // movimentação
  abrirMovimentacao(item: ItemEstoque, tipo: 'entrada' | 'saida') {
    this.itemSelecionado = item;
    this.tipoMov = tipo;
    this.quantidade = 1;
    this.observacao = '';
    this.mostrandoModalMov = true;
  }

  fecharModalMov() {
    this.mostrandoModalMov = false;
    this.itemSelecionado = null;
  }

  confirmarMovimentacao() {
    if (!this.itemSelecionado || this.quantidade <= 0) return;

    const id = this.itemSelecionado.id;
    const qtd = this.quantidade;
    const obs = this.observacao || undefined;

    const req$ = this.tipoMov === 'entrada'
      ? this.estoqueService.registrarEntrada(id, qtd, obs)
      : this.estoqueService.registrarSaida(id, qtd, obs);

    req$.subscribe({
      next: () => {
        this.fecharModalMov();
        this.carregarItens();
      },
      error: (err) => {
        console.error('Erro ao registrar movimentação:', err);
        this.mensagemErro = 'Erro ao registrar movimentação de estoque.';
      }
    });
  }

  // novo item
  abrirNovoItem() {
    this.novoItem = {
      nome: '',
      categoria: '',
      descricao: '',
      quantidade_inicial: 0,
      quantidade_minima: 0,
      localizacao: ''
    };
    this.mostrandoModalNovo = true;
  }

  fecharNovoItem() {
    this.mostrandoModalNovo = false;
  }

  salvarNovoItem() {
    if (!this.novoItem.nome.trim()) return;

    this.salvandoNovo = true;
    this.estoqueService.criarItem(this.novoItem).subscribe({
      next: () => {
        this.salvandoNovo = false;
        this.mostrandoModalNovo = false;
        this.carregarItens();
      },
      error: (err) => {
        console.error('Erro ao criar item de estoque:', err);
        this.mensagemErro = 'Erro ao criar novo item de estoque.';
        this.salvandoNovo = false;
      }
    });
  }

  // classe visual de status
  getStatusClasse(item: ItemEstoque) {
    if (item.quantidade_atual <= 0) return 'badge bg-danger';
    if (item.quantidade_atual <= item.quantidade_minima) return 'badge bg-warning text-dark';
    return 'badge bg-success';
  }
}
