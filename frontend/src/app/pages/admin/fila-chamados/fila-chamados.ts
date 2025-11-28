// src/app/pages/admin/fila-chamados/fila-chamados.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, switchMap, tap } from 'rxjs';
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
  
  private filtroSubject = new BehaviorSubject<string>('aberto');
  filtroAtual$: Observable<string> = this.filtroSubject.asObservable();

  private novoChamadoHandler = (data: any) => {
    console.log('🆕 Novo chamado recebido via WebSocket:', data);
    this.filtroSubject.next(this.filtroSubject.value);
  };

  constructor(
    private chamadoService: ChamadoService,
    private ws: WebsocketService,
    private navService: NavegacaoChamadosService // NOVO
  ) { }

  async ngOnInit(): Promise<void> {
    await this.ws.conectar();

    this.chamados$ = this.filtroSubject.pipe(
      tap(filtro => console.log(`Buscando chamados com filtro: [${filtro}]`)),
      switchMap(statusFiltrado => {
        return this.chamadoService.getMeusChamados(statusFiltrado);
      }),
      tap(chamados => {
        // NOVO: Salva os IDs no serviço
        const ids = chamados.map(c => c.id);
        this.navService.setListaChamados(ids);
      })
    );

    this.ws.offNovoChamado(this.novoChamadoHandler);
    this.ws.onNovoChamado(this.novoChamadoHandler);
  }

  ngOnDestroy(): void {
    this.ws.offNovoChamado(this.novoChamadoHandler);
  }

  mudarFiltro(novoStatus: string): void {
    this.filtroSubject.next(novoStatus);
  }

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
