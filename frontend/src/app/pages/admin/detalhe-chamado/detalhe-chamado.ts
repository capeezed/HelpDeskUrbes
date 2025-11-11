import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap, catchError, of, tap, map } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { PerfilTecnico, DadosGerais } from '../../../services/dados-gerais';
import { AuthService } from '../../../services/auth.service';
import { ComentariosService } from '../../../services/comentarios';
import { RelatorioService, RelatorioChamado } from '../../../services/relatorio';
import { WebsocketService } from '../../../services/websocket';

@Component({
  selector: 'app-detalhe-chamado',
  standalone: false,
  templateUrl: './detalhe-chamado.html',
  styleUrls: ['./detalhe-chamado.css']
})
export class DetalheChamado implements OnInit, OnDestroy {

  chamadoId!: number;
  chamado$!: Observable<Chamado | null>;
  listaTecnicos$!: Observable<PerfilTecnico[]>;

  tecnicoSelecionadoId: number | null = null;
  comentarios: any[] = [];
  novoComentario: string = '';

  isLoading = false;
  isLoadingComentario = false;
  mensagemErro = '';
  mensagemAcao = '';

  relatorio: RelatorioChamado | null = null;
  relTitulo = '';
  relTexto = '';
  salvandoRelatorio = false;

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
    private chamadoService: ChamadoService,
    private dadosGeraisService: DadosGerais,
    public authService: AuthService,
    private comentariosService: ComentariosService,
    private relatorioService: RelatorioService,
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
    const div = this.mensagensContainer?.nativeElement;
    if (div) div.scrollTop = div.scrollHeight;
  }

  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (!id) {
          this.mensagemErro = 'ID não encontrado';
          return of(null);
        }
        this.carregarRelatorio(id);
        return this.chamadoService.getChamadoById(id).pipe(
          tap(chamado => {
            this.tecnicoSelecionadoId = chamado?.atribuido_para_id || null;
          }),
          catchError(err => {
            this.mensagemErro = 'Erro ao carregar chamado';
            return of(null);
          })
        );
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

    this.comentariosService.enviarComentario(this.chamadoId, this.novoComentario)
      .subscribe({
        next: () => {
          this.novoComentario = '';
          this.isLoadingComentario = false;
        },
        error: () => {
          this.isLoadingComentario = false;
          alert('Erro ao enviar comentário');
        }
      });
  }

  isMeuComentario(autor: string): boolean {
    return autor === this.authService.usuarioAtual?.nome_completo;
  }

  carregarTecnicos(): void {
    const idAtual = this.authService.usuarioAtual?.id;
    this.listaTecnicos$ = this.dadosGeraisService.getTecnicos().pipe(
      map(tec => tec.filter(t => t.id !== idAtual)),
      catchError(() => {
        this.mensagemErro = 'Erro ao carregar técnicos';
        return of([]);
      })
    );
  }

  atribuirChamado(id: number) {
    if (!this.tecnicoSelecionadoId) return alert('Selecione um técnico');

    this.isLoading = true;

    this.chamadoService.atribuirChamado(id, this.tecnicoSelecionadoId).subscribe({
      next: () => {
        this.isLoading = false;
        this.mensagemAcao = 'Chamado atribuído com sucesso';
        this.carregarChamado();
      },
      error: () => {
        this.isLoading = false;
        alert('Erro ao atribuir chamado');
      }
    });
  }

  getStatusClass(status: string | undefined) {
    switch (status) {
      case 'aberto': return 'bg-success text-white';
      case 'em_andamento': return 'bg-warning text-dark';
      case 'resolvido':
      case 'fechado': return 'bg-secondary text-white';
      case 'pendente': return 'bg-info text-dark';
      default: return 'bg-light text-dark';
    }
  }

  mudarStatus(id: number, novoStatus: 'resolvido' | 'pendente' | 'fechado') {
    this.isLoading = true;
    this.chamadoService.mudarStatus(id, novoStatus).subscribe({
      next: () => {
        this.isLoading = false;
        this.mensagemAcao = `Status alterado para ${novoStatus}!`;
        this.carregarChamado();
      },
      error: () => {
        this.isLoading = false;
        alert('Erro ao alterar status');
      }
    });
  }

  carregarRelatorio(id: number) {
    this.relatorioService.obter(id).subscribe({
      next: r => this.relatorio = r,
      error: () => this.relatorio = null
    });
  }

  salvarRelatorio(id: number) {
    if (!this.relTitulo.trim() || !this.relTexto.trim()) {
      return alert('Preencha título e relatório');
    }

    this.salvandoRelatorio = true;

    this.relatorioService.criar(id, this.relTitulo, this.relTexto).subscribe({
      next: r => {
        this.relatorio = r;
        this.salvandoRelatorio = false;
        this.relTitulo = '';
        this.relTexto = '';
      },
      error: () => {
        this.salvandoRelatorio = false;
        alert('Erro ao salvar relatório');
      }
    });
  }
}
