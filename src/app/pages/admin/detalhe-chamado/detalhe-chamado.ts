// src/app/pages/admin/detalhe-chamado/detalhe-chamado.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, tap, catchError, of } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';

@Component({
  selector: 'app-detalhe-chamado',
  standalone: false,
  templateUrl: './detalhe-chamado.html',
  styleUrls: ['./detalhe-chamado.css']
})
export class DetalheChamado implements OnInit {

  chamado$!: Observable<Chamado | null>; // Permite ser nulo em caso de erro
  
  isLoading = false; // Loading das ações (botões)
  mensagemErro = '';
  mensagemAcao = '';

  constructor(
    private route: ActivatedRoute, // Para ler o ID da URL
    private router: Router,
    private chamadoService: ChamadoService
  ) {}

  ngOnInit(): void {
    // Carrega o chamado ao iniciar
    this.carregarChamado();
  }

  /**
   * Busca o chamado com base no ID da URL
   */
  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          // Se não houver ID, define o erro e retorna um Observable nulo
          this.mensagemErro = 'ID do chamado não fornecido.';
          return of(null); // 'of(null)' cria um Observable que emite 'null'
        }
        return this.chamadoService.getChamadoById(+id).pipe( // O '+' converte a string 'id' para number
          catchError(err => {
            this.mensagemErro = `Erro ao buscar chamado: ${err.error.message || err.message}`;
            return of(null); // Retorna nulo em caso de erro
          })
        );
      })
    );
  }

  // --- AÇÕES DO TÉCNICO ---

  atribuirAMim(id: number) {
    this.isLoading = true;
    this.mensagemAcao = '';
    this.chamadoService.atribuirChamado(id).subscribe({
      next: () => {
        this.isLoading = false;
        this.mensagemAcao = 'Chamado atribuído com sucesso!';
        this.carregarChamado(); // Recarrega os dados para mostrar a mudança
      },
      error: (err) => {
        this.isLoading = false;
        alert('Erro: ' + err.error.message); // Mostra um alerta simples
      }
    });
  }

  mudarStatus(id: number, novoStatus: 'resolvido' | 'pendente' | 'fechado') {
    this.isLoading = true;
    this.mensagemAcao = '';
    this.chamadoService.mudarStatus(id, novoStatus).subscribe({
      next: () => {
        this.isLoading = false;
        this.mensagemAcao = `Status alterado para ${novoStatus}!`;
        this.carregarChamado(); // Recarrega os dados
      },
      error: (err) => {
        this.isLoading = false;
        alert('Erro: ' + err.error.message);
      }
    });
  }

  // Função de estilo (copiada da Fila)
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
}