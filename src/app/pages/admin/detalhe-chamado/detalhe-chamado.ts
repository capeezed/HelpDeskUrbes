// src/app/pages/admin/detalhe-chamado/detalhe-chamado.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, tap, catchError, of, map } from 'rxjs'; // Importe 'map'
import { Chamado, ChamadoService } from '../../../services/chamado';

// 1. IMPORTS NECESSÁRIOS
import { PerfilTecnico, DadosGerais } from '../../../services/dados-gerais'; // Verifique o caminho
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-detalhe-chamado',
  standalone: true, 
  imports: [
    CommonModule,   
    RouterModule,   
    FormsModule     
  ],
  templateUrl: './detalhe-chamado.html',
  styleUrls: ['./detalhe-chamado.css']
})
export class DetalheChamado implements OnInit {

  chamado$!: Observable<Chamado | null>;
  
  // 2. VERIFIQUE SE ESTAS PROPRIEDADES ESTÃO DECLARADAS
  listaTecnicos$!: Observable<PerfilTecnico[]>;
  tecnicoSelecionadoId: number | null = null;
  
  isLoading = false;
  mensagemErro = '';
  mensagemAcao = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chamadoService: ChamadoService,
    private dadosGeraisService: DadosGerais, // 3. VERIFIQUE SE O SERVIÇO ESTÁ INJETADO
    public authService: AuthService 
  ) {}

  ngOnInit(): void {
    this.carregarChamado();
    
    // 4. ESTA É A CHAMADA IMPORTANTE
    this.carregarTecnicos();
  }

  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          this.mensagemErro = 'ID do chamado não fornecido.';
          return of(null);
        }
        return this.chamadoService.getChamadoById(+id).pipe( 
          tap(chamado => {
            if (chamado && chamado.atribuido_para_id) {
              this.tecnicoSelecionadoId = chamado.atribuido_para_id;
            } else {
              this.tecnicoSelecionadoId = null; 
            }
          }),
          catchError(err => {
            this.mensagemErro = `Erro ao buscar chamado: ${err.error.message || err.message}`;
            return of(null); 
          })
        );
      })
    );
  }

  // 5. FUNÇÃO PARA CARREGAR TÉCNICOS (COM FILTRO)
  carregarTecnicos(): void {
    const idUsuarioAtual = this.authService.usuarioAtual?.id;

    this.listaTecnicos$ = this.dadosGeraisService.getTecnicos().pipe(
      map(tecnicos => 
        // Filtra a lista para remover o utilizador que já está logado
        // (Para que "Rafael" não apareça 2x se ele for o 'suporte.ti')
        tecnicos.filter(t => t.id !== idUsuarioAtual)
      ),
      catchError(err => {
        // Se a chamada falhar, pelo menos o dropdown não fica vazio
        console.error("Erro ao carregar lista de técnicos", err);
        this.mensagemErro = "Não foi possível carregar a lista de técnicos.";
        return of([]); // Retorna um array vazio em caso de erro
      })
    );
  }


  // --- AÇÕES DO TÉCNICO ---

  atribuirChamado(id: number) {
    if (!this.tecnicoSelecionadoId) {
      alert('Por favor, selecione um técnico no dropdown.');
      return;
    }
    
    this.isLoading = true;
    this.mensagemAcao = '';
    
    this.chamadoService.atribuirChamado(id, this.tecnicoSelecionadoId).subscribe({
      next: () => {
        this.isLoading = false;
        this.mensagemAcao = 'Chamado atribuído com sucesso!';
        this.carregarChamado(); 
      },
      error: (err) => {
        this.isLoading = false;
        alert('Erro: ' + err.error.message);
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
        this.carregarChamado(); 
      },
      error: (err) => {
        this.isLoading = false;
        alert('Erro: ' + err.error.message);
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
}