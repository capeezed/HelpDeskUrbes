import { Component, OnInit } from '@angular/core';
import {
  AnotacaoTecnica,
  AnotacoesTecnicasService
} from '../../../services/anotacoes-tecnicas';

@Component({
  selector: 'app-anotacoes-tecnicas',
  standalone: false,
  templateUrl: './anotacoes-tecnicas.html',
  styleUrls: ['./anotacoes-tecnicas.css']
})
export class AnotacoesTecnicas implements OnInit {

  anotacoes: AnotacaoTecnica[] = [];
  isLoading = false;
  mensagemErro = '';
  mensagem = '';
  busca = '';

  mostrandoModal = false;
  salvando = false;
  anotacaoEditando: AnotacaoTecnica | null = null;

  dadosForm = {
    titulo: '',
    conteudo: ''
  };

  constructor(private anotacoesService: AnotacoesTecnicasService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar() {
    this.isLoading = true;
    this.limparMensagens();

    this.anotacoesService.listar().subscribe({
      next: res => {
        this.anotacoes = res;
        this.isLoading = false;
      },
      error: err => {
        console.error('Erro ao carregar anotacoes tecnicas:', err);
        this.mensagemErro = 'Erro ao carregar anotacoes tecnicas.';
        this.isLoading = false;
      }
    });
  }

  get anotacoesFiltradas(): AnotacaoTecnica[] {
    if (!this.busca.trim()) return this.anotacoes;

    const termo = this.busca.toLowerCase();
    return this.anotacoes.filter(a =>
      a.titulo.toLowerCase().includes(termo) ||
      a.conteudo.toLowerCase().includes(termo) ||
      (a.criado_por_nome || '').toLowerCase().includes(termo)
    );
  }

  abrirNova() {
    this.limparMensagens();
    this.anotacaoEditando = null;
    this.dadosForm = {
      titulo: '',
      conteudo: ''
    };
    this.mostrandoModal = true;
  }

  abrirEdicao(anotacao: AnotacaoTecnica) {
    this.limparMensagens();
    this.anotacaoEditando = anotacao;
    this.dadosForm = {
      titulo: anotacao.titulo,
      conteudo: anotacao.conteudo
    };
    this.mostrandoModal = true;
  }

  fecharModal() {
    if (this.salvando) return;
    this.mostrandoModal = false;
    this.anotacaoEditando = null;
    this.dadosForm = {
      titulo: '',
      conteudo: ''
    };
  }

  salvar() {
    this.limparMensagens();

    if (!this.dadosForm.titulo.trim() || !this.dadosForm.conteudo.trim()) {
      this.mensagemErro = 'Titulo e conteudo sao obrigatorios.';
      return;
    }

    this.salvando = true;

    const req$ = this.anotacaoEditando
      ? this.anotacoesService.atualizar(this.anotacaoEditando.id, this.dadosForm)
      : this.anotacoesService.criar(this.dadosForm);

    const estavaEditando = !!this.anotacaoEditando;

    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.fecharModal();
        this.mensagem = estavaEditando
          ? 'Anotacao atualizada com sucesso.'
          : 'Anotacao criada com sucesso.';
        this.carregar();
      },
      error: err => {
        console.error('Erro ao salvar anotacao tecnica:', err);
        this.salvando = false;
        this.mensagemErro = err?.error?.message || 'Erro ao salvar anotacao tecnica.';
      }
    });
  }

  remover(anotacao: AnotacaoTecnica) {
    if (!confirm(`Remover a anotacao "${anotacao.titulo}"?`)) return;

    this.limparMensagens();

    this.anotacoesService.remover(anotacao.id).subscribe({
      next: () => {
        this.mensagem = 'Anotacao removida com sucesso.';
        this.carregar();
      },
      error: err => {
        console.error('Erro ao remover anotacao tecnica:', err);
        this.mensagemErro = err?.error?.message || 'Erro ao remover anotacao tecnica.';
      }
    });
  }

  private limparMensagens() {
    this.mensagem = '';
    this.mensagemErro = '';
  }
}
