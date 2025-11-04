// src/app/pages/admin/fila-chamados/fila-chamados.component.ts

import { Component, OnInit } from '@angular/core';
// 1. IMPORTS ADICIONAIS DO RxJS
import { Observable, BehaviorSubject, switchMap, tap } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';

@Component({
  selector: 'app-fila-chamados',
  standalone: false,
  templateUrl: './fila-chamados.html',
  styleUrls: ['./fila-chamados.css']
})
export class FilaChamados implements OnInit {

  chamados$!: Observable<Chamado[]>;
  
  // 2. BehaviorSubject para guardar o filtro atual.
  // Começa mostrando apenas chamados 'aberto'
  private filtroSubject = new BehaviorSubject<string>('aberto');
  
  // 3. Observable público para o HTML saber qual botão está ativo
  filtroAtual$: Observable<string> = this.filtroSubject.asObservable();

  constructor(private chamadoService: ChamadoService) { }

  ngOnInit(): void {
    // 4. LÓGICA DE RECARGA AUTOMÁTICA
    // 'chamados$' agora "ouve" o 'filtroSubject'.
    // Sempre que o filtroSubject mudar (com .next()),
    // o 'switchMap' cancela a chamada antiga e faz uma nova.
    this.chamados$ = this.filtroSubject.pipe(
      tap(filtro => console.log(`Buscando chamados com filtro: [${filtro}]`)),
      switchMap(statusFiltrado => {
        // Chama o nosso serviço atualizado com o filtro
        // (Se statusFiltrado for '', o serviço busca todos)
        return this.chamadoService.getMeusChamados(statusFiltrado);
      })
    );
  }

  /**
   * 5. Função chamada pelos botões no HTML
   */
  mudarFiltro(novoStatus: string): void {
    // Emite o novo valor para o 'filtroSubject',
    // o que faz o 'switchMap' acima disparar automaticamente
    this.filtroSubject.next(novoStatus);
  }

  // 6. A função getStatusClass continua igual
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
}