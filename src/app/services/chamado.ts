import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; // Para saber o ID do usuário

// Interface (verifique se bate com seu banco)
export interface Chamado {
  id: number;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'fechado' | 'resolvido' | 'pendente';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  criado_por_id: number;
  categoria_id: number;
}

// Interface para criar um novo chamado
export interface NovoChamado {
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  categoria_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  /**
   * Busca chamados.
   * ATENÇÃO: O backend que fizemos busca TODOS. 
   * Vamos filtrar no frontend por enquanto.
   */
  getMeusChamados(): Observable<Chamado[]> {
    const userId = this.authService.usuarioAtual?.id;
    if (!userId) {
      return of([]); // Retorna um Observable vazio se não tiver usuário
    }

    return this.http.get<Chamado[]>(`${this.apiUrl}/chamados`).pipe(
      map(todosOsChamados => 
        todosOsChamados.filter(c => c.criado_por_id === userId)
      )
    );
  }

  /**
   * Cria um novo chamado
   */
  criarChamado(novoChamado: NovoChamado): Observable<any> {
    const userId = this.authService.usuarioAtual?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado para criar chamado.');
    }
    
    // Adiciona o ID do usuário ao payload
    const payload = {
      ...novoChamado,
      criado_por_id: userId
    };

    return this.http.post(`${this.apiUrl}/chamado`, payload);
  }
}