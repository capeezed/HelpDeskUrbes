import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ChamadoService, UsuarioSolicitante } from '../../../services/chamado';

@Component({
  selector: 'app-novo-chamado-usuario',
  standalone: false,
  templateUrl: './novo-chamado-usuario.html',
  styleUrls: ['./novo-chamado-usuario.css']
})
export class NovoChamadoUsuario implements OnInit, OnDestroy {
  usuarios: UsuarioSolicitante[] = [];

  solicitanteTipo: 'cadastrado' | 'manual' = 'cadastrado';
  solicitanteId: number | null = null;
  solicitanteNomeManual = '';
  solicitanteContatoManual = '';
  solicitanteSetorManual = '';
  origemSolicitacao: 'telefone' | 'presencial' | 'whatsapp' | 'email' | 'outro' = 'telefone';
  observacaoInterna = '';

  titulo = '';
  descricao = '';
  tipoSelecionado: 'incidente' | 'solicitacao' = 'incidente';
  categoriaSelecionada = '';

  anexosSelecionados: File[] = [];
  previewAnexos: { nome: string; url: string; origem: 'upload' | 'clipboard' }[] = [];

  isLoading = false;
  carregandoUsuarios = false;
  mensagemErro = '';
  mensagemSucesso = '';

  get categorias(): string[] {
    if (this.tipoSelecionado === 'incidente') {
      return [
        'Acesso não autorizado detectado',
        'Aplicativo não abre',
        'Computador travando',
        'Computador/monitor não liga',
        'Erro em planilhas',
        'Erro em sistema',
        'Falha no Wi-Fi',
        'Impressora não funciona',
        'Lentidão na Rede',
        'Maquina POS com defeito',
        'Mouse/Teclado/Fone/Caixa de som não funciona',
        'Não consigo enviar email',
        'Outlook não funciona',
        'Problemas com vírus',
        'Problemas de VPN',
        'Problema relacionado a bilhetagem',
        'Ramal não funciona',
        'Sem Internet/Rede'
      ];
    }

    return [
      'Alteração Site Urbes',
      'Atualização de software',
      'Configuração de assinatura de email',
      'Configuração de sistema',
      'Criar novo email',
      'Criação de novo usuário de rede',
      'Inclusão em grupo de email',
      'Instalação de aplicativos/programas',
      'Instalação impressora',
      'Liberação de acesso a pastas',
      'Mudança de layout',
      'Novo ponto de rede/ramal',
      'Reset de senha de rede',
      'Solicitação de mouse/teclado/headset',
      'Solicitação de novo computador/notebook',
      'Troca ou upgrade de computador'
    ];
  }

  constructor(
    private chamadoService: ChamadoService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  carregarUsuarios(): void {
    this.carregandoUsuarios = true;
    this.chamadoService.listarUsuariosSolicitantes().subscribe({
      next: usuarios => {
        this.usuarios = usuarios;
        this.carregandoUsuarios = false;
      },
      error: () => {
        this.carregandoUsuarios = false;
        this.mensagemErro = 'Erro ao carregar usuários cadastrados.';
      }
    });
  }

  onSolicitanteTipoChange(): void {
    this.solicitanteId = null;
    this.solicitanteNomeManual = '';
    this.solicitanteContatoManual = '';
    this.solicitanteSetorManual = '';
  }

  onTipoChange(): void {
    this.categoriaSelecionada = '';
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
        this.mensagemErro = 'Você pode enviar até 5 imagens por chamado.';
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

  handleNovoChamadoPorUsuario(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    if (!this.titulo.trim() || !this.descricao.trim() || !this.categoriaSelecionada) {
      this.mensagemErro = 'Preencha título, descrição e categoria.';
      return;
    }

    if (this.solicitanteTipo === 'cadastrado' && !this.solicitanteId) {
      this.mensagemErro = 'Selecione o usuário solicitante.';
      return;
    }

    if (this.solicitanteTipo === 'manual' && !this.solicitanteNomeManual.trim()) {
      this.mensagemErro = 'Informe o nome do solicitante.';
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('titulo', this.titulo.trim());
    formData.append('descricao', this.descricao.trim());
    formData.append('tipo', this.tipoSelecionado);
    formData.append('categoria', this.categoriaSelecionada);
    formData.append('solicitanteTipo', this.solicitanteTipo);
    formData.append('origemSolicitacao', this.origemSolicitacao);
    formData.append('observacaoInterna', this.observacaoInterna.trim());

    if (this.solicitanteTipo === 'cadastrado' && this.solicitanteId) {
      formData.append('solicitanteId', String(this.solicitanteId));
    } else {
      formData.append('solicitanteNomeManual', this.solicitanteNomeManual.trim());
      formData.append('solicitanteContatoManual', this.solicitanteContatoManual.trim());
      formData.append('solicitanteSetorManual', this.solicitanteSetorManual.trim());
    }

    for (const anexo of this.anexosSelecionados) {
      formData.append('anexos', anexo, anexo.name);
    }

    this.chamadoService.criarChamadoPorUsuario(formData).subscribe({
      next: chamado => {
        this.isLoading = false;
        this.mensagemSucesso = 'Chamado registrado e atribuído a você.';
        setTimeout(() => {
          this.router.navigate(['/admin/chamado', chamado.id]);
        }, 1200);
      },
      error: err => {
        this.isLoading = false;
        this.mensagemErro = err.error?.message || 'Erro ao registrar chamado por usuário.';
      }
    });
  }
}
