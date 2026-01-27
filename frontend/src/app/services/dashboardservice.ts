import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

export interface Relatorio {
  id: number;
  titulo_relatorio: string;
  texto_relatorio: string;
  titulo_chamado: string;
  criado_em: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  totalRelatorios(mes: any, ano: any) {
    return this.http.get<any>(`${this.apiUrl}/dashboard/total-relatorios`, {
      params: { mes, ano }
    });
  }

  chamadosPorCategoria(mes: any, ano: any) {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chamados-por-categoria`, {
      params: { mes, ano }
    });
  }

  chamadosPorStatus(mes: any, ano: any) {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chamados-por-status`, {
      params: { mes, ano }
    });
  }

  listarRelatorios(mes: any, ano: any) {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/relatorios`, {
      params: { mes, ano }
    });
  }
}
