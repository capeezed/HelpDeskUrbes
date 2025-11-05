import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode'; // Importe o jwt-decode

// Interface para os dados do usuário que virão no token
export interface User {
  id: number;
  email: string;
  nivel: 'funcionario' | 'tecnico' | 'admin';
  nome_completo: string;
  setor: string; // O token agora tem isso
  cargo: string; // O token agora tem isso
  iat: number;
  exp: number;
}

// Interface que seu backend espera no cadastro (SIMPLIFICADA)
export interface CadastroData {
  email: string;
  pass: string;
  nomeCompleto: string;
  setor: string; // <-- MUDOU DE setorId
  cargo: string; // <-- MUDOU DE cargoId
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api`; // URL base da API
  private TOKEN_KEY = 'auth-token';

  // BehaviorSubject para guardar os dados do usuário decodificados
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Ao iniciar o serviço, tenta carregar o usuário do localStorage
    this.loadUserFromToken();
  }

  public get ehTecnico(): boolean {
    const usuario = this.userSubject.value;
    if (!usuario) {
      return false;
    }
    return usuario.nivel === 'tecnico' || usuario.nivel === 'admin';
  }
  /**
   * Tenta carregar o token do localStorage
   */
  private loadUserFromToken() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      try {
        const decodedUser = jwtDecode<User>(token);
        // Verifica se o token não expirou
        if (decodedUser.exp * 1000 > Date.now()) {
          this.userSubject.next(decodedUser);
        } else {
          // Token expirado
          localStorage.removeItem(this.TOKEN_KEY);
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
        localStorage.removeItem(this.TOKEN_KEY);
      }
    }
  }

  /**
   * Tenta registrar um novo usuário
   */
  cadastrarUsuario(dados: CadastroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, dados);
  }

  /**
   * Tenta fazer login
   */
  loginComEmail(email: string, pass: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email, pass })
      .pipe(
        // 'tap' executa um efeito colateral (salvar o token)
        tap(response => {
          this.saveToken(response.token);
        }),
        catchError(err => {
          // Limpa o estado em caso de erro de login
          this.userSubject.next(null);
          throw err; // Re-lança o erro para o componente tratar
        })
      );
  }

  /**
   * Salva o token no localStorage e atualiza o user$
   */
  private saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    const decodedUser = jwtDecode<User>(token);
    this.userSubject.next(decodedUser);
  }

  /**
   * Faz o logout
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.userSubject.next(null);
  }

  /**
   * Retorna o valor ATUAL do usuário (para checagens síncronas)
   */
  get usuarioAtual(): User | null {
    return this.userSubject.value;
  }
}