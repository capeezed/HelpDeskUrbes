import { Component, OnInit } from '@angular/core';
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
export class Secure implements OnInit {

  constructor(
    private ws: WebsocketService,
    private toastr: ToastrService,
    private router: Router,
    private auth: AuthService,
    public notify: NotificationService
  ) {}

  ngOnInit() {
    this.ws.conectar();

    // ✅ FUNCIONÁRIO: chamado dele foi atribuído
    this.ws.onChamadoAtribuido(data => {
      this.notify.add({
        tipo: 'atribuicao',
        texto: data.mensagem || `Seu chamado foi atribuído a um técnico.`,
        link: `/meus-chamados/detalhe/${data.chamadoId}`
      });
    });

    // ✅ FUNCIONÁRIO: status alterado
    this.ws.onStatusAlterado(data => {
      this.notify.add({
        tipo: 'status',
        texto: `Status alterado para: ${data.status}`,
        link: `/meus-chamados/detalhe/${data.chamadoId}`
      });
    });

    // ✅ FUNCIONÁRIO: novo comentário
    this.ws.onNovoComentario(data => {
      this.notify.add({
        tipo: 'comentario',
        texto: `${data.autor} comentou no chamado.`,
        link: `/meus-chamados/detalhe/${data.chamadoId}`
      });
    });

    // ✅ TÉCNICO: novo chamado aberto (somente técnicos recebem do backend)
    if (this.auth.ehTecnico) {
      this.ws.onNovoChamado(data => {
        this.notify.add({
          tipo: 'novo-chamado',
          texto: `Novo chamado: ${data.titulo}`,
          link: `/admin/chamado/${data.id}`
        });
      });
    }
  }

  abrirNotificacoes() {
    this.notify.marcarTodasComoLidas();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
