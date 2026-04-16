import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { NotificationService } from './notification';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket!: Socket;

  constructor(
    private auth: AuthService,
    private notify: NotificationService
  ) {}

  /** Deve ser chamado após login */
  conectar() {
    if (this.socket) return; // evita criar 2 conexões

    this.socket = io(environment.apiUrl);

    const user = this.auth.usuarioAtual;
    if (user) {
      this.socket.emit('registrarUsuario', user.id);
    }

    // ✅ EVENTO 1: Novo chamado (técnicos recebem)
    this.socket.on('novo-chamado', (data: any) => {
      this.notify.add({
        tipo: 'novo-chamado',
        texto: `Novo chamado aberto: "${data.titulo}"`,
        link: `/admin/chamado/${data.chamadoId}`
      });
    });

    // ✅ EVENTO 2: Chamado atribuído a você
    this.socket.on('chamado-atribuido', (data: any) => {
      this.notify.add({
        tipo: 'atribuicao',
        texto: `Um chamado foi atribuído a você (#${data.chamadoId})`,
        link: `/admin/chamado/${data.chamadoId}`
      });
    });

    // ✅ EVENTO 3: Status alterado (técnico e funcionário)
    this.socket.on('status-alterado', (data: any) => {
      this.notify.add({
        tipo: 'status',
        texto: `Status do chamado #${data.chamadoId} mudou para "${data.status}"`,
        link: `/admin/chamado/${data.chamadoId}`
      });
    });

    // ✅ EVENTO 4: Novo comentário
    this.socket.on('novo-comentario', (data: any) => {
      this.notify.add({
        tipo: 'comentario',
        texto: `${data.autor} comentou no chamado "${data.texto.slice(0, 25)}..."`,
        link: `/admin/chamado/${data.chamadoId}`
      });
    });

    console.log('✅ Socket conectado!');
  }

  /** Deve ser chamado no logout */
  desconectar() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined as any;
    }
  }
}
