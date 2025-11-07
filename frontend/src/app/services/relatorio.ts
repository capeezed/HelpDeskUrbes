import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { Observable } from 'rxjs';

export interface RelatorioChamado {
  id: number;
  titulo: string;
  relatorio: string;
  criado_em: string;
  tecnico_nome: string | null;
}

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private api = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  obter(chamadoId: number): Observable<RelatorioChamado | null> {
    return this.http.get<RelatorioChamado | null>(`${this.api}/chamados/${chamadoId}/relatorio`);
  }

  criar(chamadoId: number, titulo: string, relatorio: string): Observable<RelatorioChamado> {
    return this.http.post<RelatorioChamado>(`${this.api}/chamados/${chamadoId}/relatorio`, { titulo, relatorio });
  }
}
