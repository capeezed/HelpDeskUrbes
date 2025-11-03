import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase'; // 1. Importe o SupabaseService
import { 
  AuthChangeEvent, 
  Session, 
  User 
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 2. Um BehaviorSubject para guardar o usuário atual.
  //    Ele "guarda" o último valor e emite para novos assinantes.
  //    Começa como nulo (ninguém logado).
  private userSubject = new BehaviorSubject<User | null>(null);

  // 3. Um Observable público que os componentes podem "ouvir".
  //    O $ no final é uma convenção para Observables.
  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    // 4. A MÁGICA ACONTECE AQUI:
    //    Ouve as mudanças de autenticação do Supabase (LOGIN, LOGOUT, etc)
    this.supabaseService.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // 5. Atualiza o BehaviorSubject com o novo usuário (ou nulo)
        this.userSubject.next(session?.user ?? null);
      }
    );
  }

  // Helper para facilitar o acesso ao cliente
  private get supabase() {
    return this.supabaseService.supabase;
  }

  /**
   * Faz o login com email e senha.
   * Agora ele retorna a promessa inteira.
   */
  async loginComEmail(email: string, pass: string) {
    // O onAuthStateChange vai cuidar de atualizar o estado
    return this.supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
  }

  /**
   * Cria um novo usuário.
   */
  async cadastrarUsuario(email: string, pass: string) {
    return this.supabase.auth.signUp({
      email: email,
      password: pass,
    });
  }

  /**
   * Faz o logout do usuário.
   */
  async logout() {
    // O onAuthStateChange vai detectar o LOGGED_OUT e atualizar o userSubject
    return this.supabase.auth.signOut();
  }

  /**
   * Retorna o valor ATUAL do usuário (para checagens rápidas)
   */
  get usuarioAtual(): User | null {
    return this.userSubject.value;
  }
}