// src/app/pages/admin/estoque/estoque.component.ts

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

  // controles simples para entrada/saída
  itemSelecionado: ItemEstoque | null = null;
  tipoMov: 'entrada' | 'saida' = 'entrada';
  quantidade = 1;
  observacao = '';
  mostrandoModal = false;

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
      },
      error: (err) => {
        console.error('Erro ao carregar estoque:', err);
        this.mensagemErro = 'Erro ao carregar itens de estoque.';
        this.isLoading = false;
      }
    });
  }

  abrirMovimentacao(item: ItemEstoque, tipo: 'entrada' | 'saida') {
    this.itemSelecionado = item;
    this.tipoMov = tipo;
    this.quantidade = 1;
    this.observacao = '';
    this.mostrandoModal = true;
  }

  fecharModal() {
    this.mostrandoModal = false;
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
        this.fecharModal();
        this.carregarItens(); // recarrega quantidades
      },
      error: (err) => {
        console.error('Erro ao registrar movimentação:', err);
        this.mensagemErro = 'Erro ao registrar movimentação de estoque.';
      }
    });
  }
}
