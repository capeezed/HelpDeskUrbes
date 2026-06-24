import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { Observable } from 'rxjs';

export interface AnotacaoArquivo {
  id: number;
  anotacao_id: number;
  nome_original: string;
  mime_type: string;
  tamanho: number;
  uploaded_by: number | null;
  uploaded_by_nome: string | null;
  created_at: string;
}

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
  arquivos: AnotacaoArquivo[];
}

@Injectable({ providedIn: 'root' })
export class AnotacoesTecnicasService {
  private apiUrl = `${environment.apiUrl}/api/admin/anotacoes-tecnicas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<AnotacaoTecnica[]> {
    return this.http.get<AnotacaoTecnica[]>(this.apiUrl);
  }

  criar(dados: FormData) {
    return this.http.post(this.apiUrl, dados);
  }

  atualizar(id: number, dados: FormData) {
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  remover(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  removerArquivo(anotacaoId: number, arquivoId: number) {
    return this.http.delete(`${this.apiUrl}/${anotacaoId}/arquivos/${arquivoId}`);
  }

  baixarArquivo(anotacaoId: number, arquivoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${anotacaoId}/arquivos/${arquivoId}/download`, {
      responseType: 'blob'
    });
  }
}
