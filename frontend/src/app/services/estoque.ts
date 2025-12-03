// src/app/services/estoque.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

export interface ItemEstoque {
  id: number;
  nome: string;
  categoria?: string;
  descricao?: string;
  quantidade_atual: number;
  quantidade_minima: number;
  localizacao?: string;
}

@Injectable({ providedIn: 'root' })
export class EstoqueService {

  private baseUrl = `${environment.apiUrl}/api/estoque`;

  constructor(private http: HttpClient) {}

  listarItens() {
    return this.http.get<ItemEstoque[]>(`${this.baseUrl}/itens`);
  }

  registrarEntrada(id: number, quantidade: number, observacao?: string) {
    return this.http.post(`${this.baseUrl}/itens/${id}/entrada`, { quantidade, observacao });
  }

  registrarSaida(id: number, quantidade: number, observacao?: string) {
    return this.http.post(`${this.baseUrl}/itens/${id}/saida`, { quantidade, observacao });
  }

  criarItem(dados: {
    nome: string;
    categoria?: string;
    descricao?: string;
    quantidade_inicial?: number;
    quantidade_minima?: number;
    localizacao?: string;
  }) {
    return this.http.post(`${this.baseUrl}/itens`, dados);
  }

}
