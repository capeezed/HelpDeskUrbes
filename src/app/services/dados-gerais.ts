import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
export interface Setor {
  id: number;
  nome: string;
}
export interface Cargo {
  id: number;
  nome: string;
  setor_id: number;
}
export interface Categoria {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class DadosGerais {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  getSetores(): Observable<Setor[]> {
    return this.http.get<Setor[]>(`${this.apiUrl}/setores`);
  }

  getCargos(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.apiUrl}/cargos`);
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`);
  }
}