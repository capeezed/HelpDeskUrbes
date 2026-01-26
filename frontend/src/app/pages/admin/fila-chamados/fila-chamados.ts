// src/app/pages/admin/fila-chamados/fila-chamados.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, switchMap, tap, map } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { WebsocketService } from '../../../services/websocket';
import { NavegacaoChamadosService } from '../../../services/navegacao-chamados';

@Component({
  selector: 'app-fila-chamados',
  standalone: false,
  templateUrl: './fila-chamados.html',
  styleUrls: ['./fila-chamados.css']
})
export class FilaChamados implements OnInit, OnDestroy {

  chamados$!: Observable<Chamado[]>;

  // ===== PAGINAÇÃO =====
  page = 1;
  limit = 20;
  totalPages = 1;

  // ===== FILTRO =====
  private filtroSubject = new BehaviorSubject<string>('aberto');
  filtroAtual$ = this.filtroSubject.asObservable();

  // ===== SOCKET =====
  private novoChamadoHandler = (data: any) => {
    console.log('🆕 Novo chamado recebido via WebSocket:', data);

    // só recarrega se estiver na primeira página
    if (this.page === 1) {
      this.filtroSubject.next(this.filtroSubject.value);
    }
  };

  constructor(
    private chamadoService: ChamadoService,
    private ws: WebsocketService,
    private navService: NavegacaoChamadosService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.ws.conectar();

    this.chamados$ = this.filtroSubject.pipe(
      tap(filtro => {
        console.log(`Buscando chamados | status: [${filtro}] | página: ${this.page}`);
      }),
      switchMap(status =>
        this.chamadoService.getMeusChamados(status, this.page, this.limit)
      ),
      tap(res => {
        this.totalPages = res.totalPages;

        // salva IDs para navegação entre chamados
        const ids = res.data.map(c => c.id);
        this.navService.setListaChamados(ids);
      }),
      map(res => res.data)
    );

    this.ws.offNovoChamado(this.novoChamadoHandler);
    this.ws.onNovoChamado(this.novoChamadoHandler);
  }

  ngOnDestroy(): void {
    this.ws.offNovoChamado(this.novoChamadoHandler);
  }

  // ===== AÇÕES =====

  mudarFiltro(novoStatus: string): void {
    this.page = 1; // sempre volta pra primeira página ao trocar filtro
    this.filtroSubject.next(novoStatus);
  }

  paginaAnterior(): void {
    if (this.page > 1) {
      this.page--;
      this.filtroSubject.next(this.filtroSubject.value);
    }
  }

  proximaPagina(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.filtroSubject.next(this.filtroSubject.value);
    }
  }

  trackById(_: number, chamado: Chamado) {
    return chamado.id;
  }

  // ===== UI HELPERS =====

  getStatusClass(status: string | undefined) {
    switch (status) {
      case 'aberto': return 'bg-success text-white';
      case 'em_andamento': return 'bg-warning text-dark';
      case 'pendente': return 'bg-info text-dark';
      case 'resolvido':
      case 'fechado': return 'bg-secondary text-white';
      default: return 'bg-light text-dark';
    }
  }

  getPrioridadeClass(prioridade: string | undefined) {
    switch (prioridade) {
      case 'urgente': return 'bg-danger text-white';
      case 'alta': return 'bg-warning text-dark';
      case 'media': return 'bg-info text-white';
      case 'baixa': return 'bg-secondary text-white';
      default: return 'bg-light text-dark';
    }
  }
}
