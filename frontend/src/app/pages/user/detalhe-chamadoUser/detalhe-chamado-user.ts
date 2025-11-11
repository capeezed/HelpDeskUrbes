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
  this.route.paramMap.subscribe(params => {
    this.chamadoId = Number(params.get('id'));
    if (!this.chamadoId) return;

    // 🔹 carrega dados do chamado e os comentários do banco
    this.carregarChamado();
    this.carregarComentarios();

    // 🔹 escuta novos comentários em tempo real (via WebSocket)
    this.ws.onNovoComentario(data => {
      if (data.chamadoId === this.chamadoId) {
        this.comentarios.push(data);
        this.scrollToBottom();
      }
    });
  });
}


  ngOnDestroy(): void {
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

  carregarComentarios(scroll = false): void {
    this.comentariosService.getComentarios(this.chamadoId).subscribe({
      next: (res) => {
        this.comentarios = res;
        if (scroll) queueMicrotask(() => this.scrollToBottom());
      },
      error: () => this.mensagemErro = 'Erro ao carregar comentários.'
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
