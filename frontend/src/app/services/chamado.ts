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
  sla_prazo_em?: string;
  sla_minutos_restantes?: number;
  sla_status?: 'dentro' | 'alerta' | 'vencido' | 'encerrado';
}

// Interface para criar um novo chamado (Simplificada)
export interface NovoChamado {
  titulo: string;
  descricao: string;
  tipo: 'incidente' | 'solicitacao';     // ✅ JÁ TEM
}

export function getSlaClass(status: Chamado['sla_status'] | undefined): string {
  switch (status) {
    case 'vencido': return 'bg-danger text-white';
    case 'alerta': return 'bg-warning text-dark';
    case 'encerrado': return 'bg-secondary text-white';
    case 'dentro': return 'bg-success text-white';
    default: return 'bg-light text-dark';
  }
}

export function getSlaLabel(status: Chamado['sla_status'] | undefined): string {
  switch (status) {
    case 'vencido': return 'SLA vencido';
    case 'alerta': return 'SLA em alerta';
    case 'encerrado': return 'SLA encerrado';
    case 'dentro': return 'Dentro do SLA';
    default: return 'SLA indisponivel';
  }
}

export function formatarTempoSla(minutos: number | undefined): string {
  if (minutos === undefined || minutos === null) return 'Sem prazo';

  const atrasado = minutos < 0;
  const total = Math.abs(minutos);
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const mins = total % 60;

  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (horas) partes.push(`${horas}h`);
  if (!dias && mins) partes.push(`${mins}min`);

  const tempo = partes.length ? partes.join(' ') : 'menos de 1min';
  return atrasado ? `${tempo} atrasado` : `${tempo} restantes`;
}

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getMeusChamados(
  status: string | undefined,
  page: number = 1,
  limit: number = 20
): Observable<{
  data: Chamado[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  let httpParams = new HttpParams()
    .set('page', page)
    .set('limit', limit);

  if (status) {
    httpParams = httpParams.set('status', status);
  }

  return this.http.get<{
    data: Chamado[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>(`${this.apiUrl}/chamados`, {
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
