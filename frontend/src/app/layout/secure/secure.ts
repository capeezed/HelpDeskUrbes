import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from './../../services/websocket';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-secure',
  standalone: false,
  templateUrl: './secure.html',
  styleUrls: ['./secure.css'],
})
export class Secure implements OnInit, OnDestroy {

  // Guarda referências dos handlers para o off
  private chamadoAtribuidoHandler = (data: any) => {
    this.notify.add({
      tipo: 'atribuicao',
      texto: data.mensagem || `Seu chamado foi atribuído a um técnico.`,
      link: `/meus-chamados/detalhe/${data.chamadoId}`
    });
  };
  private statusAlteradoHandler = (data: any) => {
    this.notify.add({
      tipo: 'status',
      texto: `Status alterado para: ${data.status}`,
      link: `/meus-chamados/detalhe/${data.chamadoId}`
    });
  };
  private novoComentarioHandler = (data: any) => {
    this.notify.add({
      tipo: 'comentario',
      texto: `${data.autor} comentou no chamado.`,
      link: `/meus-chamados/detalhe/${data.chamadoId}`
    });
  };
  private novoChamadoHandler = (data: any) => {
    this.notify.add({
      tipo: 'novo-chamado',
      texto: `Novo chamado: ${data.titulo}`,
      link: `/admin/chamado/${data.id}`
    });
  };

  constructor(
    private ws: WebsocketService,
    private toastr: ToastrService,
    private router: Router,
    private auth: AuthService,
    public notify: NotificationService
  ) {}

  ngOnInit() {
    this.auth.usuarioCarregado$.subscribe(async (carregado) => {
      if (carregado && this.auth.usuarioAtual) {
        await this.ws.conectar();

        // Remove listeners antigos SEMPRE antes de adicionar os novos
        this.ws.offChamadoAtribuido(this.chamadoAtribuidoHandler);
        this.ws.offStatusAlterado(this.statusAlteradoHandler);
        this.ws.offNovoComentario(this.novoComentarioHandler);
        this.ws.offNovoChamado(this.novoChamadoHandler);

        this.ws.onChamadoAtribuido(this.chamadoAtribuidoHandler);
        this.ws.onStatusAlterado(this.statusAlteradoHandler);
        this.ws.onNovoComentario(this.novoComentarioHandler);

        if (this.auth.ehTecnico) {
          this.ws.onNovoChamado(this.novoChamadoHandler);
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Remove todos os listeners ao destruir o componente (troca de usuário, logout, navegação)
    this.ws.offChamadoAtribuido(this.chamadoAtribuidoHandler);
    this.ws.offStatusAlterado(this.statusAlteradoHandler);
    this.ws.offNovoComentario(this.novoComentarioHandler);
    this.ws.offNovoChamado(this.novoChamadoHandler);
  }

  abrirNotificacoes() {
    this.notify.marcarTodasComoLidas();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
    // Remove listeners imediatamente no logout
    this.ngOnDestroy();
  }
}
