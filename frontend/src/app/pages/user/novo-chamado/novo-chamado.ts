// src/app/pages/novo-chamado/novo-chamado.component.ts

import { Component, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ChamadoService } from '../../../services/chamado';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-novo-chamado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
export class NovoChamado {

  titulo = '';
  descricao = '';
  
  // NOVAS PROPRIEDADES
  tipoSelecionado: 'incidente' | 'solicitacao' = 'incidente';
  categoriaSelecionada = '';
  
  anexosSelecionados: File[] = [];
  previewAnexos: { nome: string; url: string; origem: 'upload' | 'clipboard' }[] = [];

  isLoading = false;
  mensagemErro = '';
  mensagemSucesso = '';

  // Categorias dinâmicas baseadas no tipo
  get categorias(): string[] {
    if (this.tipoSelecionado === 'incidente') {
      return [
        "Acesso não autorizado detectado",
        "Aplicativo não abre",
        "Computador travando",
        "Computador/monitor não liga",
        "Erro em planilhas",
        "Erro em sistema",
        "Falha no Wi-Fi",
        "Impressora não funciona",
        "Lentidão na Rede",
        "Maquina POS com defeito",
        "Mouse/Teclado/Fone/Caixa de som não funciona",
        "Não consigo enviar email",
        "Outlook não funciona",
        "Problemas com vírus",
        "Problemas de VPN",
        "Problema relacionado a bilhetagem",
        "Ramal não funciona",
        "Sem Internet/Rede"
      ];
    } else {
      return [
        "Alteração Site Urbes",
        "Atualização de software",
        "Configuração de assinatura de email",
        "Configuração de sistema",
        "Criar novo email",
        "Criação de novo usuário de rede",
        "Inclusão em grupo de email",
        "Instalação de aplicativos/programas",
        "Instalação impressora",
        "Liberação de acesso a pastas",
        "Mudança de layout",
        "Novo ponto de rede/ramal",
        "Reset de senha de rede",
        "Solicitação de mouse/teclado/headset",
        "Solicitação de novo computador/notebook",
        "Troca ou upgrade de computador"
      ];
    }
  }

  constructor(
    private chamadoService: ChamadoService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  @HostListener('document:paste', ['$event'])
  onDocumentPaste(event: ClipboardEvent): void {
    this.processarImagemColada(event);
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.adicionarArquivos(Array.from(event.target.files), 'upload');
      event.target.value = '';
    }
  }

  onPasteAreaPaste(event: ClipboardEvent): void {
    this.processarImagemColada(event);
  }

  removerAnexo(index: number): void {
    const preview = this.previewAnexos[index];
    if (preview) {
      URL.revokeObjectURL(preview.url);
    }

    this.previewAnexos.splice(index, 1);
    this.anexosSelecionados.splice(index, 1);
  }

  private processarImagemColada(event: ClipboardEvent): void {
    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems?.length) return;

    for (const item of Array.from(clipboardItems)) {
      if (!item.type.startsWith('image/')) continue;

      const imageFile = item.getAsFile();
      if (!imageFile) continue;

      const extension = imageFile.type.split('/')[1] || 'png';
      const fileName = `clipboard-${Date.now()}.${extension}`;

      const novoArquivo = new File([imageFile], fileName, {
        type: imageFile.type,
        lastModified: Date.now()
      });
      this.adicionarArquivos([novoArquivo], 'clipboard');
      this.mensagemErro = '';
      event.preventDefault();
      return;
    }
  }

  private adicionarArquivos(files: File[], origem: 'upload' | 'clipboard'): void {
    for (const file of files) {
      if (this.anexosSelecionados.length >= 5) {
        this.mensagemErro = 'VocÃª pode enviar atÃ© 5 imagens por chamado.';
        break;
      }

      if (!file.type.startsWith('image/')) continue;

      this.anexosSelecionados.push(file);
      this.previewAnexos.push({
        nome: file.name,
        origem,
        url: URL.createObjectURL(file)
      });
    }
  }

  private clearPreviewUrls(): void {
    for (const preview of this.previewAnexos) {
      URL.revokeObjectURL(preview.url);
    }

    this.anexosSelecionados = [];
    this.previewAnexos = [];
  }

  // Reseta a categoria quando muda o tipo
  onTipoChange(): void {
    this.categoriaSelecionada = '';
  }

  async handleNovoChamado() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    
    if (!this.titulo || !this.descricao) {
      this.mensagemErro = 'Por favor, preencha o Título e a Descrição.';
      return;
    }

    if (!this.categoriaSelecionada) {
      this.mensagemErro = 'Por favor, selecione uma categoria.';
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('titulo', this.titulo);
    formData.append('descricao', this.descricao);
    formData.append('tipo', this.tipoSelecionado); // NOVO
    formData.append('categoria', this.categoriaSelecionada); // NOVO
    
    for (const anexo of this.anexosSelecionados) {
      formData.append('anexos', anexo, anexo.name);
    }

    this.chamadoService.criarChamado(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Chamado aberto com sucesso! Redirecionando...';
        
        this.titulo = '';
        this.descricao = '';
        this.tipoSelecionado = 'incidente';
        this.categoriaSelecionada = '';
        this.anexosSelecionados = [];
        this.clearPreviewUrls();

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
