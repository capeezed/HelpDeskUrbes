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

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios() {
    this.carregando = true;
    this.userService.listarUsuarios().subscribe({
      next: res => {
        this.usuarios = res;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        alert('Erro ao carregar usuários');
      }
    });
  }

  alterarNivel(user: UsuarioAdmin, novoNivel: 'funcionario' | 'tecnico') {
    this.userService.alterarNivel(user.id, novoNivel).subscribe({
      next: () => {
        user.nivel = novoNivel;
        this.mensagem = 'Perfil atualizado com sucesso!';
      },
      error: () => alert('Erro ao atualizar perfil')
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
}
