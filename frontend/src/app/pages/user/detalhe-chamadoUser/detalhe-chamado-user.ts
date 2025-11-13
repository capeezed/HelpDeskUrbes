import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap, of, catchError } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { ComentariosService } from '../../../services/comentarios';
import { AuthService } from '../../../services/auth.service';
import { WebsocketService } from '../../../services/websocket';

@Component({
  selector: 'app-detalhe-chamado-user',
  standalone: false,
  templateUrl: './detalhe-chamado-user.html',
  styleUrls: ['./detalhe-chamado-user.css']
})
export class DetalheChamadoUser implements OnInit, OnDestroy {

  chamadoId!: number;
  chamado$!: Observable<Chamado | null>;
  comentarios: any[] = [];
  novoComentario: string = '';
  isLoadingComentario = false;
  mensagemErro = '';

  @ViewChild('mensagensContainer') mensagensContainer!: ElementRef<HTMLDivElement>;

  // handler de realtime
  private novoComentarioHandler = (payload: any) => {
    if (Number(payload?.chamadoId) !== this.chamadoId) return;

    this.comentarios.push({
      texto: payload.texto,
      autor: payload.autor,
      autor_nivel: payload.autor_nivel,
      criado_em: payload.criado_em
    });

    queueMicrotask(() => this.scrollToBottom());
  };

  constructor(
    private route: ActivatedRoute,
    private chamadoService: ChamadoService,
    private comentariosService: ComentariosService,
    public authService: AuthService,
    private ws: WebsocketService
  ) {}

  ngOnInit(): void {
  this.chamadoId = Number(this.route.snapshot.paramMap.get('id'));
  if (!this.chamadoId) return;

  this.ws.conectar();
  this.carregarChamado();
  this.carregarComentarios();

  // Remove listener antigo (se existir) e adiciona novo
  this.ws.offNovoComentario(this.novoComentarioHandler);
  this.ws.onNovoComentario(this.novoComentarioHandler);
}

ngOnDestroy(): void {
  // SEMPRE remove ao sair do componente
  this.ws.offNovoComentario(this.novoComentarioHandler);
}


  scrollToBottom() {
    const box = this.mensagensContainer?.nativeElement;
    if (box) box.scrollTop = box.scrollHeight;
  }

  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (!id) return of(null);
        return this.chamadoService.getChamadoById(id);
      }),
      catchError(() => {
        this.mensagemErro = 'Erro ao carregar chamado.';
        return of(null);
      })
    );
  }

  carregarComentarios(): void {
  console.log('🌀 Carregando comentários para', this.chamadoId);
  this.comentariosService.getComentarios(this.chamadoId)
    .subscribe({
      next: (res) => {
        console.log('✅ Comentários recebidos:', res);
        this.comentarios = res;
        queueMicrotask(() => this.scrollToBottom());
      },
      error: (err) => {
        console.error('❌ Erro ao carregar comentários:', err);
        this.mensagemErro = 'Erro ao carregar comentários.';
      }
    });
}


  enviarComentario(): void {
    if (!this.novoComentario.trim()) return;

    this.isLoadingComentario = true;

    this.comentariosService.enviarComentario(this.chamadoId, this.novoComentario).subscribe({
      next: () => {
        this.novoComentario = '';
        this.isLoadingComentario = false;
        // não precisa recarregar porque o realtime entra automático
      },
      error: () => {
        this.isLoadingComentario = false;
        alert('Erro ao enviar comentário.');
      }
    });
  }

  isMeuComentario(autor: string): boolean {
    return autor === this.authService.usuarioAtual?.nome_completo;
  }
}
