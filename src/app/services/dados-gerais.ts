import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

// Interfaces para os dados
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

  constructor(private supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.supabase;
  }

  /**
   * Busca TODOS os setores
   */
  async getSetores(): Promise<Setor[]> {
    const { data, error } = await this.supabase
      .from('setores')
      .select('id, nome')
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar setores:', error);
      return [];
    }
    return data;
  }

  /**
   * Busca TODOS os cargos
   * (Poderíamos buscar só por setor, mas buscar todos é mais fácil
   * e podemos filtrar no lado do Angular)
   */
  async getCargos(): Promise<Cargo[]> {
    const { data, error } = await this.supabase
      .from('cargos')
      .select('id, nome, setor_id')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar cargos:', error);
      return [];
    }
    return data;
  }

  async getCategorias(): Promise<Categoria[]> {
    const { data, error } = await this.supabase
      .from('categorias')
      .select('id, nome')
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
    return data;
  }
}