import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { jwtDecode } from 'jwt-decode';

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

  // ✅ adicionamos isso
  private usuarioCarregadoSubject = new BehaviorSubject<boolean>(false);
  public usuarioCarregado$ = this.usuarioCarregadoSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  get ehTecnico(): boolean {
    const usuario = this.userSubject.value;
    return usuario ? usuario.nivel === 'tecnico' || usuario.nivel === 'admin' : false;
  }

  estaLogado(): boolean {
    return this.userSubject.value !== null;
  }

  private loadUserFromToken() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        if (decoded.exp * 1000 > Date.now()) {
          this.userSubject.next(decoded);
        } else {
          localStorage.removeItem(this.TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    }
    // ✅ indica que o carregamento terminou
    this.usuarioCarregadoSubject.next(true);
  }

  cadastrarUsuario(dados: CadastroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, dados);
  }

  loginComEmail(email: string, pass: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email, pass })
      .pipe(
        tap(r => this.saveToken(r.token)),
        catchError(err => {
          this.userSubject.next(null);
          this.usuarioCarregadoSubject.next(true);
          throw err;
        })
      );
  }

  private saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    const decoded = jwtDecode<User>(token);
    this.userSubject.next(decoded);
    this.usuarioCarregadoSubject.next(true);
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.userSubject.next(null);
  }

  get usuarioAtual(): User | null {
    return this.userSubject.value;
  }
}