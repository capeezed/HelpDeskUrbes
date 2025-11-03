import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase'; // 1. Importe o SupabaseService
import { 
  AuthChangeEvent, 
  Session, 
  User 
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';


export interface CadastroData {
  email: string;
  pass: string;
  nomeCompleto: string;
  setorId: number;
  cargoId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userSubject = new BehaviorSubject<User | null>(null);

  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {

    this.supabaseService.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
 
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
  async cadastrarUsuario(dados: CadastroData) {
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: dados.email,
      password: dados.pass,
    });

    if (authError) {
      console.error('Erro no signUp (auth):', authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      const error = new Error('Usuário não foi criado no auth.');
      console.error(error.message);
      return { data: null, error };
    }

    // 2. Inserir os dados extras na tabela (perfis)
    const { data: profileData, error: profileError } = await this.supabase
      .from('perfis')
      .insert({
        id: authData.user.id,
        nome_completo: dados.nomeCompleto,
        setor_id: dados.setorId, // MUDOU AQUI
        cargo_id: dados.cargoId  // MUDOU AQUI
    });

    if (profileError) {
      console.error('Erro ao criar perfil (public.perfis):', profileError);
      // Aqui, o ideal seria deletar o usuário do auth (rollback)
      // Mas por enquanto, vamos apenas retornar o erro.
      return { data: null, error: profileError };
    }

    // Deu tudo certo!
    return { data: { authUser: authData.user, profile: profileData }, error: null };
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