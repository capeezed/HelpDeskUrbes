// src/app/services/chamado.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Interface (COMPLETA E CORRIGIDA)
// Esta interface agora inclui os campos do JOIN que o seu HTML precisa
export interface Chamado {
  id: number;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'fechado' | 'resolvido' | 'pendente';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  criado_por_id: number;
  criado_em: string; 
  atribuido_para_id: number | null; 

  // --- CAMPOS NOVOS DO JOIN ---
  solicitante_nome?: string;
  solicitante_setor?: string;
  solicitante_cargo?: string;

  // --- AQUI ESTÁ A CORREÇÃO ---
  anexo_url?: string; // <-- ADICIONE ESTA LINHA
}

// Interface para criar um novo chamado (Simplificada)
export interface NovoChamado {
  titulo: string;
  descricao: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  /**
   * Busca chamados (Inteligente: todos para TI, só os meus para funcionário)
   */
  getMeusChamados(status?: string): Observable<Chamado[]> {
    // 2. Cria os parâmetros HTTP
    let httpParams = new HttpParams();

    // 3. Adiciona o parâmetro 'status' APENAS SE ele foi fornecido
    if (status) {
      httpParams = httpParams.set('status', status);
    }
    
    // 4. Envia a requisição com os parâmetros
    // (O Interceptor ainda cuida do token de autenticação)
    return this.http.get<Chamado[]>(`${this.apiUrl}/chamados`, { 
      params: httpParams 
    });
  }

  /**
   * Cria um novo chamado
   */
  criarChamado(formData: FormData): Observable<any> {
    // O AuthService/Interceptor já adiciona o token.
    // O HttpClient é inteligente: quando vê FormData, ele define
    // o Content-Type como 'multipart/form-data' automaticamente.
    return this.http.post(`${this.apiUrl}/chamado`, formData);
  }

  /**
   * NOVO: Busca um único chamado pelo seu ID.
   */
  getChamadoById(id: number): Observable<Chamado> {
    // Rota protegida (apenasTecnicos), Interceptor envia o token
    return this.http.get<Chamado>(`${this.apiUrl}/chamado/${id}`);
  }

  /**
   * NOVO: Técnico se atribui a um chamado.
   */
  atribuirChamado(id: number): Observable<any> {
    // Rota protegida (apenasTecnicos), Interceptor envia o token
    return this.http.put(`${this.apiUrl}/chamados/${id}/atribuir`, {});
  }

  /**
   * NOVO: Técnico muda o status de um chamado.
   */
  mudarStatus(id: number, novoStatus: string): Observable<any> {
    // Rota protegida (apenasTecnicos), Interceptor envia o token
    return this.http.put(`${this.apiUrl}/chamados/${id}/status`, { novoStatus });
  }
}