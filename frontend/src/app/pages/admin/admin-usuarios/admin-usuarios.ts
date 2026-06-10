import { Component, OnInit } from '@angular/core';
import { UserService, UsuarioAdmin } from '../../../services/user-service';

@Component({
  selector: 'app-admin-usuarios',
  templateUrl: './admin-usuarios.html',
  styleUrls: ['./admin-usuarios.css'],
  standalone: false
})
export class AdminUsuarios implements OnInit {

  usuarios: UsuarioAdmin[] = [];
  carregando = false;
  mensagem = '';
  mensagemErro = '';
  usuarioSenha: UsuarioAdmin | null = null;
  novaSenha = '';
  confirmacaoSenha = '';
  salvandoSenha = false;
  excluindoId: number | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios() {
    this.carregando = true;
    this.limparMensagens();

    this.userService.listarUsuarios().subscribe({
      next: res => {
        this.usuarios = res;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.mensagemErro = 'Erro ao carregar usuários.';
      }
    });
  }

  alterarNivel(user: UsuarioAdmin, novoNivel: 'funcionario' | 'tecnico') {
    this.limparMensagens();

    this.userService.alterarNivel(user.id, novoNivel).subscribe({
      next: () => {
        user.nivel = novoNivel;
        this.mensagem = 'Perfil atualizado com sucesso!';
      },
      error: () => this.mensagemErro = 'Erro ao atualizar perfil.'
    });
  }

  abrirModalSenha(user: UsuarioAdmin) {
    this.limparMensagens();
    this.usuarioSenha = user;
    this.novaSenha = '';
    this.confirmacaoSenha = '';
  }

  fecharModalSenha() {
    if (this.salvandoSenha) return;
    this.usuarioSenha = null;
    this.novaSenha = '';
    this.confirmacaoSenha = '';
  }

  salvarSenha() {
    if (!this.usuarioSenha) return;

    this.limparMensagens();

    if (this.novaSenha !== this.confirmacaoSenha) {
      this.mensagemErro = 'A confirmação da senha não confere.';
      return;
    }

    this.salvandoSenha = true;
    this.userService.alterarSenha(this.usuarioSenha.id, this.novaSenha).subscribe({
      next: () => {
        const nome = this.usuarioSenha?.nome_completo;
        this.salvandoSenha = false;
        this.fecharModalSenha();
        this.mensagem = `Senha de ${nome} atualizada com sucesso.`;
      },
      error: (err) => {
        this.salvandoSenha = false;
        this.mensagemErro = err?.error?.message || 'Erro ao alterar senha.';
      }
    });
  }

  excluirUsuario(user: UsuarioAdmin) {
    const confirmado = window.confirm(
      `Excluir o usuário "${user.nome_completo}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmado) return;

    this.limparMensagens();
    this.excluindoId = user.id;

    this.userService.excluirUsuario(user.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(u => u.id !== user.id);
        this.excluindoId = null;
        this.mensagem = 'Usuário excluído com sucesso.';
      },
      error: (err) => {
        this.excluindoId = null;
        this.mensagemErro = err?.error?.message || 'Erro ao excluir usuário.';
      }
    });
  }

  getNivelClass(nivel: string) {
    switch (nivel) {
      case 'admin': return 'bg-danger text-white';
      case 'tecnico': return 'bg-warning text-dark';
      case 'funcionario': return 'bg-info text-white';
      default: return 'bg-secondary';
    }
  }

  private limparMensagens() {
    this.mensagem = '';
    this.mensagemErro = '';
  }
}
