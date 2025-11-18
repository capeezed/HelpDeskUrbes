// src/app/services/chamado.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { AuthService } from './auth.service';

// Interface (COMPLETA E CORRIGIDA)
export interface Chamado {
  id: number;
  titulo: string;
  descricao: string;
  tipo: 'incidente' | 'solicitacao';     // ✅ JÁ TEM
  categoria?: string;                     // ⚠️ ADICIONE ESTA LINHA
  status: 'aberto' | 'em_andamento' | 'fechado' | 'resolvido' | 'pendente';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  criado_por_id: number;
  criado_em: string; 
  atribuido_para_id: number | null; 
  anexo_url?: string; 
  solicitante_nome?: string;
  solicitante_setor?: string;
  solicitante_cargo?: string;
  tecnico_atribuido_nome?: string;
}

// Interface para criar um novo chamado (Simplificada)
export interface NovoChamado {
  titulo: string;
  descricao: string;
  tipo: 'incidente' | 'solicitacao';     // ✅ JÁ TEM
}

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getMeusChamados(status?: string): Observable<Chamado[]> {
    let httpParams = new HttpParams();

    if (status) {
      httpParams = httpParams.set('status', status);
    }
    
    return this.http.get<Chamado[]>(`${this.apiUrl}/chamados`, { 
      params: httpParams 
    });
  }

  criarChamado(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/chamado`, formData);
  }

  getChamadoById(id: number): Observable<Chamado> {
    return this.http.get<Chamado>(`${this.apiUrl}/chamado/${id}`);
  }

  atribuirChamado(chamadoId: number, tecnicoId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/chamados/${chamadoId}/atribuir`, { tecnicoId });
  }

  mudarStatus(id: number, novoStatus: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/chamados/${id}/status`, { novoStatus });
  }

  alterarPrioridade(chamadoId: number, prioridade: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/chamados/${chamadoId}/prioridade`, { prioridade });
  }
}
