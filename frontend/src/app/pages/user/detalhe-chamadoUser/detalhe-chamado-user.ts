// src/app/pages/user/detalhe-chamado-user/detalhe-chamado-user.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, of, catchError, map } from 'rxjs';
import {
  Chamado,
  ChamadoService,
  formatarTempoSla,
  getSlaClass,
  getSlaLabel
} from '../../../services/chamado';
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

  // ===================== SOCKET HANDLERS =====================

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

  private chamadoAtribuidoHandler = (payload: any) => {
    if (Number(payload?.chamadoId) !== this.chamadoId) return;

    this.chamado$ = this.chamado$.pipe(
      map(chamado => {
        if (!chamado) return chamado;

        return {
          ...chamado,
          status: 'em_andamento',
          tecnico_atribuido_nome: payload.tecnicoNome || chamado.tecnico_atribuido_nome,
          atribuido_para_id: payload.tecnicoId || chamado.atribuido_para_id
        };
      })
    );
  };

  // ============================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chamadoService: ChamadoService,
    private comentariosService: ComentariosService,
    public authService: AuthService,
    private ws: WebsocketService,
    private navService: NavegacaoChamadosService
  ) {}

  ngOnInit(): void {
    this.chamadoId = Number(this.route.snapshot.paramMap.get('id'));

    this.carregarChamado();
    this.carregarComentarios();

    // Comentários em tempo real
    this.ws.offNovoComentario(this.novoComentarioHandler);
    this.ws.onNovoComentario(this.novoComentarioHandler);

    // Atribuição em tempo real
    this.ws.offChamadoAtribuido(this.chamadoAtribuidoHandler);
    this.ws.onChamadoAtribuido(this.chamadoAtribuidoHandler);
  }

  ngOnDestroy(): void {
    this.ws.offNovoComentario(this.novoComentarioHandler);
    this.ws.offChamadoAtribuido(this.chamadoAtribuidoHandler);
  }

  // ===================== NAVEGAÇÃO =====================

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

  // ===================== UI =====================

  scrollToBottom() {
    const box = this.mensagensContainer?.nativeElement;
    if (box) box.scrollTop = box.scrollHeight;
  }

  isMeuComentario(autor: string): boolean {
    return autor === this.authService.usuarioAtual?.nome_completo;
  }

  // ===================== DATA =====================

  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (!id) return of(null);

        this.chamadoId = id;
        this.carregarComentarios();

        return this.chamadoService.getChamadoById(id);
      }),
      catchError(() => {
        this.mensagemErro = 'Erro ao carregar chamado.';
        return of(null);
      })
    );
  }

  carregarComentarios(): void {
    this.comentariosService.getComentarios(this.chamadoId).subscribe({
      next: res => {
        this.comentarios = res;
        queueMicrotask(() => this.scrollToBottom());
      },
      error: () => {
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

  getSlaClass = getSlaClass;
  getSlaLabel = getSlaLabel;
  formatarTempoSla = formatarTempoSla;
}
