import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

// Interface dos dados que vêm do token
export interface User {
  id: number;
  email: string;
  nivel: 'funcionario' | 'tecnico' | 'admin';
  nome_completo: string;
  setor: string;
  cargo: string;
  iat: number;
  exp: number;
}

// Payload do cadastro
export interface CadastroData {
  email: string;
  pass: string;
  nomeCompleto: string;
  setor: string;
  cargo: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api`;
  private TOKEN_KEY = 'auth-token';

  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  /** Indica se o usuário é técnico ou admin */
  public get ehTecnico(): boolean {
    const usuario = this.userSubject.value;
    return usuario ? (usuario.nivel === 'tecnico' || usuario.nivel === 'admin') : false;
  }

  /** ✅ NOVO MÉTODO: retorna true se há token válido */
  estaLogado(): boolean {
    return this.userSubject.value !== null;
  }

  /** Carrega usuário do token salvo */
  private loadUserFromToken() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      try {
        const decodedUser = jwtDecode<User>(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          this.userSubject.next(decodedUser);
        } else {
          localStorage.removeItem(this.TOKEN_KEY);
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
        localStorage.removeItem(this.TOKEN_KEY);
      }
    }
  }

  /** Cadastro */
  cadastrarUsuario(dados: CadastroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, dados);
  }

  /** Login */
  loginComEmail(email: string, pass: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email, pass })
      .pipe(
        tap(response => this.saveToken(response.token)),
        catchError(err => {
          this.userSubject.next(null);
          throw err;
        })
      );
  }

  /** Salva token e atualiza estado */
  private saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    const decodedUser = jwtDecode<User>(token);
    this.userSubject.next(decodedUser);
  }

  /** Logout */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.userSubject.next(null);
  }

  /** Retorna o usuário atual sincronamente */
  get usuarioAtual(): User | null {
    return this.userSubject.value;
  }
}
