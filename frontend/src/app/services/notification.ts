import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notificacao {
  id: number;
  texto: string;
  tipo: 'novo-chamado' | 'atribuicao' | 'status' | 'info' | 'comentario';
  criado_em: Date;
  lida: boolean;
  link: string;
  tempo?: string; // ✅ adicionamos
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private STORAGE_KEY = 'notificacoes-helpdesk';

  private lista: Notificacao[] = [];

  private notificacoesSubject = new BehaviorSubject<Notificacao[]>([]);
  public notificacoes$: Observable<Notificacao[]> = this.notificacoesSubject.asObservable();

  private totalNaoLidasSubject = new BehaviorSubject<number>(0);
  public totalNaoLidas$: Observable<number> = this.totalNaoLidasSubject.asObservable();

  constructor() {
    this.carregarLocal();
  }

  /**
   * Adiciona uma nova notificação (aceita parcial vinda do socket)
   */
  add(notif: Partial<Notificacao>) {
    const nova: Notificacao = {
      id: Date.now(),
      texto: notif.texto ?? '',
      tipo: notif.tipo ?? 'info',
      link: notif.link ?? '',
      criado_em: new Date(),
      lida: false,
      tempo: 'agora mesmo'
    };

    this.lista.unshift(nova);
    this.atualizarEstado();
  }

  /** Marca uma notificação como lida */
  marcarComoLida(id: number) {
    this.lista = this.lista.map(n => n.id === id ? { ...n, lida: true } : n);
    this.atualizarEstado();
  }

  /** Marca todas como lidas */
  marcarTodasComoLidas() {
    this.lista = this.lista.map(n => ({ ...n, lida: true }));
    this.atualizarEstado();
  }

  /** Remove todas notificações */
  limparTodas() {
    this.lista = [];
    this.atualizarEstado();
  }

  /** Atualiza estado, persiste e notifica Subscribers */
  private atualizarEstado() {
  // recalcula tempo relativo antes de enviar ao front
  const listaComTempo = this.lista.map(n => ({
    ...n,
    tempo: this.calcularTempo(n)
  }));

  this.notificacoesSubject.next(listaComTempo);
  this.salvarLocal();
  this.totalNaoLidasSubject.next(this.lista.filter(n => !n.lida).length);
}

  /** Salva no localStorage */
  private salvarLocal() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.lista));
  }

  /** Carrega do localStorage */
  private carregarLocal() {
  const salvo = localStorage.getItem(this.STORAGE_KEY);
  if (!salvo) return;

  this.lista = JSON.parse(salvo).map((n: any) => ({
    ...n,
    criado_em: new Date(n.criado_em)
  }));

  this.atualizarEstado(); // ✅ recalcula tempo e contador
}


  private calcularTempo(notif: Notificacao): string {
  const diff = Date.now() - notif.criado_em.getTime();
  const minutos = Math.floor(diff / 60000);

  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias}d`;
  }

}
