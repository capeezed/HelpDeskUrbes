import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService, Notificacao } from '../../services/notification';
import { WebsocketService } from '../../services/websocket';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit {

  constructor(
    public authService: AuthService,
    public notify: NotificationService,
    private router: Router,
    private ws: WebsocketService
  ) {}

  ngOnInit(): void {}

  abrirLink(n: Notificacao) {
    this.notify.marcarComoLida(n.id);
    this.router.navigate([n.link]);
  }

  limparNotificacoes() {
    this.notify.limparTodas();
  }

  logout() {
    this.notify.limparTodas();
    this.authService.logout();
    this.router.navigate(['/login']);
    this.ws.desconectar();
  }
}
