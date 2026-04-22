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

  arquivoSelecionado: File | null = null;
  origemAnexo: 'upload' | 'clipboard' | null = null;
  previewAnexoUrl: string | null = null;

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
    this.clearPreviewUrl();
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
      this.arquivoSelecionado = event.target.files[0];
      this.origemAnexo = 'upload';
      this.updatePreviewUrl(this.arquivoSelecionado);
      return;
    }

    this.arquivoSelecionado = null;
    this.origemAnexo = null;
    this.clearPreviewUrl();
  }

  onPasteAreaPaste(event: ClipboardEvent): void {
    this.processarImagemColada(event);
  }

  removerAnexo(): void {
    this.arquivoSelecionado = null;
    this.origemAnexo = null;
    this.clearPreviewUrl();
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

      this.arquivoSelecionado = new File([imageFile], fileName, {
        type: imageFile.type,
        lastModified: Date.now()
      });
      this.origemAnexo = 'clipboard';
      this.updatePreviewUrl(this.arquivoSelecionado);
      this.mensagemErro = '';
      event.preventDefault();
      return;
    }
  }

  private updatePreviewUrl(file: File | null): void {
    this.clearPreviewUrl();

    if (!file || !file.type.startsWith('image/')) return;

    this.previewAnexoUrl = URL.createObjectURL(file);
  }

  private clearPreviewUrl(): void {
    if (this.previewAnexoUrl) {
      URL.revokeObjectURL(this.previewAnexoUrl);
      this.previewAnexoUrl = null;
    }
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

    if (this.arquivoSelecionado) {
      formData.append('anexo', this.arquivoSelecionado, this.arquivoSelecionado.name);
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
