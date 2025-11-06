import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, switchMap, catchError } from 'rxjs';
import { Chamado, ChamadoService } from '../../../services/chamado';
import { ComentariosService } from '../../../services/comentarios';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-detalhe-chamado-user',
  standalone: false,
  templateUrl: './detalhe-chamado-user.html',
  styleUrls: ['./detalhe-chamado-user.css']
})
export class DetalheChamadoUser implements OnInit {

  chamado$!: Observable<Chamado | null>;
  comentarios: any[] = [];
  novoComentario: string = '';
  mensagemErro = '';
  isLoadingComentario = false;

  constructor(
    private route: ActivatedRoute,
    private chamadoService: ChamadoService,
    private comentariosService: ComentariosService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarChamado();
    this.carregarComentarios();
  }

  carregarChamado(): void {
    this.chamado$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        return this.chamadoService.getChamadoById(+id);
      }),
      catchError(err => {
        this.mensagemErro = 'Erro ao carregar chamado.';
        return of(null);
      })
    );
  }

  carregarComentarios(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.comentariosService.getComentarios(+id).subscribe({
      next: (res) => (this.comentarios = res),
      error: () => (this.mensagemErro = 'Erro ao carregar comentários.')
    });
  }

  enviarComentario(): void {
    if (!this.novoComentario.trim()) return;

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isLoadingComentario = true;

    this.comentariosService.enviarComentario(+id, this.novoComentario).subscribe({
      next: () => {
        this.novoComentario = '';
        this.isLoadingComentario = false;
        this.carregarComentarios();
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
}
