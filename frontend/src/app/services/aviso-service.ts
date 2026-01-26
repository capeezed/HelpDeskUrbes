import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { Observable } from 'rxjs';

export interface Aviso {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'critico';
  ativo: number;
}

@Injectable({ providedIn: 'root' })
export class AvisoService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  listarPublicos(): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${this.apiUrl}/avisos-publicos`);
  }

  listarTodos(): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${this.apiUrl}/admin/avisos`);
  }

  criar(aviso: Partial<Aviso>) {
    return this.http.post(`${this.apiUrl}/admin/avisos`, aviso);
  }

  atualizar(id: number, aviso: Partial<Aviso>) {
    return this.http.put(`${this.apiUrl}/admin/avisos/${id}`, aviso);
  }

  remover(id: number) {
    return this.http.delete(`${this.apiUrl}/admin/avisos/${id}`);
  }
}
