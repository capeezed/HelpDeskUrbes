// src/app/pages/user/detalhe-chamado-user/detalhe-chamado-user.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, of, catchError } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { ComentariosService } from '../../../services/comentarios';
import { AuthService } from '../../../services/auth.service';
import { WebsocketService } from '../../../services/websocket';
import { NavegacaoChamadosService } from '../../../services/navegacao-chamados';

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
    private router: Router,
    private chamadoService: ChamadoService,
    private comentariosService: ComentariosService,
    public authService: AuthService,
    private ws: WebsocketService,
    private navService: NavegacaoChamadosService // NOVO
  ) {}

  ngOnInit(): void {
    this.chamadoId = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarChamado();
    this.carregarComentarios();
    this.ws.offNovoComentario(this.novoComentarioHandler);
    this.ws.onNovoComentario(this.novoComentarioHandler);
  }

  ngOnDestroy(): void {
    this.ws.offNovoComentario(this.novoComentarioHandler);
  }

  // NOVO: Usa o serviço para obter IDs anterior e próximo
  get chamadoIdAnterior() {
    return this.navService.getAnteriorId(this.chamadoId);
  }

  get chamadoIdProximo() {
    return this.navService.getProximoId(this.chamadoId);
  }

  irParaChamado(id: number | undefined) {
    if (id !== undefined) {
      this.router.navigate(['/user/chamado', id]);
    }
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
        this.chamadoId = id; // Atualiza o ID ao navegar
        this.carregarComentarios(); // Recarrega comentários ao mudar de chamado
        return this.chamadoService.getChamadoById(id);
      }),
      catchError(() => {
        this.mensagemErro = 'Erro ao carregar chamado.';
        return of(null);
      })
    );
  }

  carregarComentarios(): void {
    this.comentariosService.getComentarios(this.chamadoId)
      .subscribe({
        next: (res) => {
          this.comentarios = res;
          queueMicrotask(() => this.scrollToBottom());
        },
        error: (err) => {
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
