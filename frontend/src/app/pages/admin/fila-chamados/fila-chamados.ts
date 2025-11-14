// src/app/pages/admin/fila-chamados/fila-chamados.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, switchMap, tap } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { WebsocketService } from '../../../services/websocket';

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

  // Handler para remoção correta do listener
  private novoChamadoHandler = (data: any) => {
    console.log('🆕 Novo chamado recebido via WebSocket:', data);
    // Recarrega a lista forçando nova busca com o filtro atual
    this.filtroSubject.next(this.filtroSubject.value);
  };

  constructor(
    private chamadoService: ChamadoService,
    private ws: WebsocketService
  ) { }

  async ngOnInit(): Promise<void> {
    // Garante que o WebSocket está conectado
    await this.ws.conectar();

    // Configura a lógica de recarga automática baseada no filtro
    this.chamados$ = this.filtroSubject.pipe(
      tap(filtro => console.log(`Buscando chamados com filtro: [${filtro}]`)),
      switchMap(statusFiltrado => {
        return this.chamadoService.getMeusChamados(statusFiltrado);
      })
    );

    // Escuta novos chamados via WebSocket e recarrega automaticamente
    this.ws.offNovoChamado(this.novoChamadoHandler); // Remove listener antigo
    this.ws.onNovoChamado(this.novoChamadoHandler);   // Adiciona listener
  }

  ngOnDestroy(): void {
    // Remove listener ao destruir componente
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
