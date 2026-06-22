import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { Observable } from 'rxjs';

export interface AnotacaoTecnica {
  id: number;
  titulo: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string;
  criado_por_id: number;
  atualizado_por_id: number | null;
  criado_por_nome: string;
  atualizado_por_nome: string | null;
}

@Injectable({ providedIn: 'root' })
export class AnotacoesTecnicasService {
  private apiUrl = `${environment.apiUrl}/api/admin/anotacoes-tecnicas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<AnotacaoTecnica[]> {
    return this.http.get<AnotacaoTecnica[]>(this.apiUrl);
  }

  criar(dados: { titulo: string; conteudo: string }) {
    return this.http.post(this.apiUrl, dados);
  }

  atualizar(id: number, dados: { titulo: string; conteudo: string }) {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  remover(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
