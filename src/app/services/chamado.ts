import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase'; // Importa nosso cliente Supabase
import { AuthService } from './auth.service';      // Importa o Auth para saber o usuário logado

// Definindo uma interface para o nosso Chamado (boa prática)
export interface Chamado {
  id?: number;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'pendente' | 'resolvido' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  criado_por?: string; // ID do usuário
  categoria_id: number; // ID da Categoria (Hardware/Software)
}

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {

  // Pede o SupabaseService e o AuthService (para saber QUEM está logado)
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) { }

  // Helper para facilitar o acesso
  private get supabase() {
    return this.supabaseService.supabase;
  }

  /**
   * Busca todos os chamados
   */
  async getTodosChamados() {
    const { data, error } = await this.supabase
      .from('chamados') // Nome da tabela no Supabase
      .select('*')
      .order('criado_em', { ascending: false }); // Mais novos primeiro

    if (error) {
      console.error('Erro ao buscar chamados:', error.message);
      return [];
    }
    return data;
  }

  /**
   * Busca apenas os chamados do usuário logado
   */
  async getMeusChamados(): Promise<Chamado[]> {
    const usuario = this.authService.usuarioAtual;
    if (!usuario) return []; // Se não tem usuário, retorna array vazio

    const { data, error } = await this.supabase
      .from('chamados')
      .select('*')
      .eq('criado_por', usuario.id) // Filtra por 'criado_por' == ID do usuário
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar meus chamados:', error.message);
      return [];
    }
    return data;
  }

  /**
   * Cria um novo chamado
   */
  async criarChamado(novoChamado: Omit<Chamado, 'id' | 'criado_por' | 'status'>) {
    const usuario = this.authService.usuarioAtual;
    if (!usuario) throw new Error('Usuário não autenticado.');

    const { data, error } = await this.supabase
      .from('chamados')
      .insert({
        // ...novoChamado (passa titulo, descricao, prioridade, categoria_id)
        ...novoChamado,
        criado_por: usuario.id, // Associa o chamado ao usuário logado
        status: 'aberto' // O status inicial é sempre 'aberto'
      })
      .select(); // Retorna o registro que acabou de ser criado

    if (error) {
      console.error('Erro ao criar chamado:', error.message);
      throw error;
    }

    return data;
  }
}