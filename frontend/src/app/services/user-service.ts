import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { Observable } from 'rxjs';

export interface UsuarioAdmin {
  id: number;
  nome_completo: string;
  email: string;
  nivel: 'admin' | 'tecnico' | 'funcionario';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://191.242.225.226:300/api'
;

  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.apiUrl}/admin/usuarios`);
  }

  alterarNivel(id: number, nivel: 'funcionario' | 'tecnico'): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/usuarios/${id}/nivel`, { nivel });
  }

  alterarSenha(id: number, senha: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/usuarios/${id}/senha`, { senha });
  }

  excluirUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/usuarios/${id}`);
  }
}
