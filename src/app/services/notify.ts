import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  // unread por chamado
  unread = new Map<number, number>();
  // feed de toasts
  private _toasts$ = new BehaviorSubject<{title:string;body:string} | null>(null);
  toasts$ = this._toasts$.asObservable();

  addUnread(chamadoId: number) {
    const v = (this.unread.get(chamadoId) || 0) + 1;
    this.unread.set(chamadoId, v);
  }
  clearUnread(chamadoId: number) {
    this.unread.delete(chamadoId);
  }
  get totalUnread() {
    let t = 0; this.unread.forEach(v => t += v); return t;
  }

  toast(title: string, body: string) {
    this._toasts$.next({ title, body });
    setTimeout(() => this._toasts$.next(null), 4000);
  }
}
