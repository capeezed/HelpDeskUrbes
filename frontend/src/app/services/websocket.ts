import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from './../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket?: Socket;
  private isConnecting = false;
  private pendingCallbacks: (() => void)[] = [];

  constructor(private auth: AuthService) {}

  conectar(): Promise<void> {
    return new Promise((resolve) => {
      // Já conectado
      if (this.socket && this.socket.connected) {
        return resolve();
      }

      // Já tentando conectar — espera
      if (this.isConnecting) {
        this.pendingCallbacks.push(resolve);
        return;
      }

      this.isConnecting = true;

      this.socket = io(environment.apiUrl.replace('/api', ''), {
        transports: ['websocket'],
        withCredentials: true
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket conectado:', this.socket?.id);

        const user = this.auth.usuarioAtual;
        if (user) this.socket?.emit('registrarUsuario', user.id);

        this.isConnecting = false;
        this.pendingCallbacks.forEach(cb => cb());
        this.pendingCallbacks = [];
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.warn('⚠️ WebSocket desconectado');
      });
    });
  }

  async onNovoComentario(callback: (data: any) => void) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⏳ Socket ainda não conectado. Tentando reconectar...');
      await this.conectar();
    }
    this.socket?.on('novo-comentario', callback);
  }

  offNovoComentario(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('novo-comentario', callback);
    else this.socket.off('novo-comentario');
  }

  async onChamadoAtribuido(callback: (data: any) => void) {
    if (!this.socket || !this.socket.connected) await this.conectar();
    this.socket?.on('chamado-atribuido', callback);
  }

  async onStatusAlterado(callback: (data: any) => void) {
    if (!this.socket || !this.socket.connected) await this.conectar();
    this.socket?.on('status-alterado', callback);
  }

  async onNovoChamado(callback: (data: any) => void) {
    if (!this.socket || !this.socket.connected) await this.conectar();
    this.socket?.on('novo-chamado', callback);
  }
}
