import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService, CadastroData } from '../../../services/auth.service'

@Component({
  selector: 'app-cadastro',
  standalone: false,
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.css']
})
export class Cadastro {

  nomeCompleto = ''
  email = ''
  password = ''
  confirmPassword = ''
  setor = ''
  cargo = ''

  mensagemErro = ''
  mensagemSucesso = ''
  isLoading = false

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private senhaValida(senha: string): boolean {
    const regex = /^(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>\/?]).{8,32}$/
    return regex.test(senha)
  }

  handleCadastro() {
    this.mensagemErro = ''
    this.mensagemSucesso = ''
    this.isLoading = true

    if (!this.email || !this.nomeCompleto || !this.setor || !this.cargo) {
      this.mensagemErro = 'Por favor, preencha todos os campos.'
      this.isLoading = false
      return
    }

    if (this.password !== this.confirmPassword) {
      this.mensagemErro = 'As senhas não coincidem.'
      this.isLoading = false
      return
    }

    if (!this.senhaValida(this.password)) {
      this.mensagemErro =
        'A senha deve ter entre 8 e 32 caracteres e conter ao menos um caractere especial.'
      this.isLoading = false
      return
    }

    const dados: CadastroData = {
      email: this.email,
      pass: this.password,
      nomeCompleto: this.nomeCompleto,
      setor: this.setor,
      cargo: this.cargo
    }

    this.authService.cadastrarUsuario(dados).subscribe({
      next: () => {
        this.isLoading = false
        this.mensagemSucesso = 'Conta criada com sucesso! Redirecionando para o login...'
        setTimeout(() => {
          this.router.navigate(['/login'])
        }, 3000)
      },
      error: (err) => {
        this.isLoading = false
        this.mensagemErro = err.error?.message || 'Erro desconhecido ao cadastrar.'
      }
    })
  }
}
