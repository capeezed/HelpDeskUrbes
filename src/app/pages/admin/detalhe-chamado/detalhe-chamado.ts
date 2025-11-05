import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, tap, catchError, of, map } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { PerfilTecnico, DadosGerais } from '../../../services/dados-gerais';
import { AuthService } from '../../../services/auth.service';
import { ComentariosService } from '../../../services/comentarios';
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
  listaTecnicos$!: Observable<PerfilTecnico[]>;
  tecnicoSelecionadoId: number | null = null;
  comentarios: any[] = [];
  novoComentario: string = '';

  isLoading = false;
  mensagemErro = '';
  mensagemAcao = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chamadoService: ChamadoService,
    private dadosGeraisService: DadosGerais,
    public authService: AuthService,
    private comentariosService: ComentariosService
  ) {}

  ngOnInit(): void {
    this.carregarChamado();
    this.carregarTecnicos();
    this.carregarComentarios();
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
            this.tecnicoSelecionadoId = chamado?.atribuido_para_id || null;
          }),
          catchError(err => {
            this.mensagemErro = `Erro ao buscar chamado: ${err.error.message || err.message}`;
            return of(null);
          })
        );
      })
    );
  }

  carregarTecnicos(): void {
    const idUsuarioAtual = this.authService.usuarioAtual?.id;

    this.listaTecnicos$ = this.dadosGeraisService.getTecnicos().pipe(
      map(tecnicos => tecnicos.filter(t => t.id !== idUsuarioAtual)),
      catchError(err => {
        console.error("Erro ao carregar lista de técnicos", err);
        this.mensagemErro = "Não foi possível carregar a lista de técnicos.";
        return of([]);
      })
    );
  }

  carregarComentarios(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    this.comentariosService.getComentarios(id)
      .subscribe(res => this.comentarios = res);
  }

  enviarComentario(): void {
    if (!this.novoComentario.trim()) return;

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.comentariosService.enviarComentario(id, this.novoComentario)
      .subscribe(() => {
        this.novoComentario = '';
        this.carregarComentarios();
      });
  }

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
}
