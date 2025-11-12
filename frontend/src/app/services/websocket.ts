import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService, User } from './auth.service';
import { environment } from './../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket?: Socket;
  private connectedUserId?: number;

  constructor(private auth: AuthService) {}

  /**
   * 🔗 Conecta o socket se ainda não estiver conectado.
   * Garante que não cria várias conexões.
   */
  async conectar(): Promise<void> {
    // já conectado
    if (this.socket && this.socket.connected) return;

    // aguarda o AuthService carregar o usuário
    const user = await new Promise<User | null>((resolve) => {
      const current = this.auth.usuarioAtual;
      if (current) return resolve(current);

      const sub = this.auth.usuarioCarregado$.subscribe(carregado => {
        if (carregado) {
          sub.unsubscribe();
          resolve(this.auth.usuarioAtual);
        }
      });
    });

    // sem usuário → sai
    if (!user) {
      console.warn('⚠️ Nenhum usuário logado, não conectando WebSocket.');
      return;
    }

    // conecta
    this.socket = io(environment.apiUrl.replace('/api', ''), {
      transports: ['websocket'],
      withCredentials: true
    });

    // aguarda conexão, mas garante timeout (para não travar)
    await Promise.race([
      new Promise<void>((resolve) => {
        this.socket!.on('connect', () => {
          console.log('✅ WebSocket conectado:', this.socket?.id);
          this.socket?.emit('registrarUsuario', user.id);
          console.log('📡 Registrado no servidor como usuário ID:', user.id);
          this.connectedUserId = user.id;
          resolve();
        });
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject('⏰ Timeout ao conectar WebSocket'), 4000)
      )
    ]).catch(err => console.warn(err));

    this.socket.on('disconnect', () => {
      console.warn('⚠️ WebSocket desconectado');
      this.connectedUserId = undefined;
    });
  }

  /**
   * ✅ Registra listener de novo comentário
   */
  onNovoComentario(callback: (data: any) => void) {
    if (!this.socket) {
      console.warn('⏳ Socket não inicializado ainda. Chamando conectar()...');
      this.conectar().then(() => {
        this.socket?.on('novo-comentario', callback);
      });
    } else {
      this.socket.on('novo-comentario', callback);
    }
  }

  /**
   * ❌ Remove listener de novo comentário (para evitar duplicação)
   */
  offNovoComentario(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('novo-comentario', callback);
    else this.socket.off('novo-comentario');
  }

  /**
   * ✅ Registra listener de chamado atribuído
   */
  onChamadoAtribuido(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('chamado-atribuido', callback);
  }

  /**
   * ❌ Remove listener de chamado atribuído
   */
  offChamadoAtribuido(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('chamado-atribuido', callback);
    else this.socket.off('chamado-atribuido');
  }

  /**
   * ✅ Registra listener de status alterado
   */
  onStatusAlterado(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('status-alterado', callback);
  }

  /**
   * ❌ Remove listener de status alterado
   */
  offStatusAlterado(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('status-alterado', callback);
    else this.socket.off('status-alterado');
  }

  /**
   * ✅ Registra listener de novo chamado
   */
  onNovoChamado(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('novo-chamado', callback);
  }

  /**
   * ❌ Remove listener de novo chamado
   */
  offNovoChamado(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('novo-chamado', callback);
    else this.socket.off('novo-chamado');
  }

  /**
   * ❌ Encerra conexão manualmente (ex: ao deslogar)
   */
  desconectar() {
    if (this.socket) {
      console.log('🔌 Desconectando WebSocket...');
      this.socket.disconnect();
      this.socket = undefined;
      this.connectedUserId = undefined;
    }
  }
}
