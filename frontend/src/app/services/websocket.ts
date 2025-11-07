import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket!: Socket;
  private readonly url = `http://${window.location.hostname}:3000`;



  constructor(private authService: AuthService) {}

  conectar() {
    const user = this.authService.usuarioAtual;
    if (!user) return;

    this.socket = io(this.url, {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket.id);

      // Registra usuário no backend
      this.socket.emit('registrarUsuario', user.id);
    });
  }

  // --- Eventos recebidos ---
  onNovoChamado(callback: (data: any) => void) {
    this.socket.on('novo-chamado', callback);
  }

  onChamadoAtribuido(callback: (data: any) => void) {
    this.socket.on('chamado-atribuido', callback);
  }

  onStatusAlterado(callback: (data: any) => void) {
    this.socket.on('status-alterado', callback);
  }

  onNovoComentario(callback: (data: any) => void) {
    this.socket.on('novo-comentario', callback);
  }

  offNovoComentario(callback: (data: any) => void) {
  if (!this.socket) return;
  this.socket.off('novo-comentario', callback);
}
}
