import { Component, OnInit } from '@angular/core';
import {
  AnotacaoArquivo,
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
  arquivosSelecionados: File[] = [];
  removendoArquivoId: number | null = null;
  baixandoArquivoId: number | null = null;

  dadosForm = {
    titulo: '',
    conteudo: ''
  };

  readonly acceptArquivos = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.xls',
    '.xlsx',
    '.csv',
    '.zip',
    '.rar',
    '.log',
    '.sql',
    '.xml',
    '.json',
    '.md'
  ].join(',');

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
    this.arquivosSelecionados = [];
    this.mostrandoModal = true;
  }

  abrirEdicao(anotacao: AnotacaoTecnica) {
    this.limparMensagens();
    this.anotacaoEditando = anotacao;
    this.dadosForm = {
      titulo: anotacao.titulo,
      conteudo: anotacao.conteudo
    };
    this.arquivosSelecionados = [];
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
    this.arquivosSelecionados = [];
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.adicionarArquivos(Array.from(event.target.files as FileList));
      event.target.value = '';
    }
  }

  removerArquivoSelecionado(index: number): void {
    this.arquivosSelecionados.splice(index, 1);
  }

  private adicionarArquivos(files: File[]): void {
    const totalExistente = this.anotacaoEditando?.arquivos?.length || 0;

    for (const file of files) {
      if (totalExistente + this.arquivosSelecionados.length >= 10) {
        this.mensagemErro = 'Limite de 10 arquivos por anotacao.';
        break;
      }

      if (file.size > 100 * 1024 * 1024) {
        this.mensagemErro = `O arquivo "${file.name}" excede o limite de 100 MB.`;
        continue;
      }

      const ext = this.getExtensaoArquivo(file.name);
      if (!this.extensaoPermitida(ext)) {
        this.mensagemErro = `O arquivo "${file.name}" nao possui um formato permitido.`;
        continue;
      }

      this.arquivosSelecionados.push(file);
    }
  }

  private criarFormData(): FormData {
    const formData = new FormData();
    formData.append('titulo', this.dadosForm.titulo);
    formData.append('conteudo', this.dadosForm.conteudo);

    for (const arquivo of this.arquivosSelecionados) {
      formData.append('arquivos', arquivo, arquivo.name);
    }

    return formData;
  }

  salvar() {
    this.limparMensagens();

    if (!this.dadosForm.titulo.trim() || !this.dadosForm.conteudo.trim()) {
      this.mensagemErro = 'Titulo e conteudo sao obrigatorios.';
      return;
    }

    this.salvando = true;
    const formData = this.criarFormData();

    const req$ = this.anotacaoEditando
      ? this.anotacoesService.atualizar(this.anotacaoEditando.id, formData)
      : this.anotacoesService.criar(formData);

    const estavaEditando = !!this.anotacaoEditando;

    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.fecharModal();
        this.mensagem = estavaEditando
          ? 'Anotacao atualizada com sucesso.'
          : 'Anotacao criada com sucesso.';
        this.arquivosSelecionados = [];
        this.carregar();
      },
      error: err => {
        console.error('Erro ao salvar anotacao tecnica:', err);
        this.salvando = false;
        this.mensagemErro = err?.error?.message || 'Erro ao salvar anotacao tecnica.';
      }
    });
  }

  removerArquivo(anotacao: AnotacaoTecnica, arquivo: AnotacaoArquivo) {
    if (!confirm(`Remover o arquivo "${arquivo.nome_original}"?`)) return;

    this.limparMensagens();
    this.removendoArquivoId = arquivo.id;

    this.anotacoesService.removerArquivo(anotacao.id, arquivo.id).subscribe({
      next: () => {
        anotacao.arquivos = anotacao.arquivos.filter(a => a.id !== arquivo.id);
        if (this.anotacaoEditando?.id === anotacao.id) {
          this.anotacaoEditando.arquivos = anotacao.arquivos;
        }
        this.removendoArquivoId = null;
        this.mensagem = 'Arquivo removido com sucesso.';
      },
      error: err => {
        console.error('Erro ao remover arquivo:', err);
        this.removendoArquivoId = null;
        this.mensagemErro = err?.error?.message || 'Erro ao remover arquivo.';
      }
    });
  }

  baixarArquivo(anotacao: AnotacaoTecnica, arquivo: AnotacaoArquivo) {
    this.baixandoArquivoId = arquivo.id;

    this.anotacoesService.baixarArquivo(anotacao.id, arquivo.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = arquivo.nome_original;
        link.click();
        URL.revokeObjectURL(url);
        this.baixandoArquivoId = null;
      },
      error: err => {
        console.error('Erro ao baixar arquivo:', err);
        this.baixandoArquivoId = null;
        this.mensagemErro = 'Erro ao baixar arquivo.';
      }
    });
  }

  formatarTamanho(bytes: number): string {
    if (!bytes) return '0 KB';

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  getTipoArquivo(arquivo: AnotacaoArquivo): string {
    const ext = this.getExtensaoArquivo(arquivo.nome_original).replace('.', '').toUpperCase();
    return ext || arquivo.mime_type;
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

  private getExtensaoArquivo(nome: string): string {
    const partes = nome.toLowerCase().split('.');
    return partes.length > 1 ? `.${partes.pop()}` : '';
  }

  private extensaoPermitida(ext: string): boolean {
    return this.acceptArquivos.split(',').includes(ext);
  }
}
