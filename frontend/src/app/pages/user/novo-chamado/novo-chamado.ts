// src/app/pages/novo-chamado/novo-chamado.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChamadoService, NovoChamado as NovoChamadoData } from '../../../services/chamado';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-novo-chamado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
export class NovoChamado {

  titulo = '';
  descricao = '';
  
  // NOVAS PROPRIEDADES
  tipoSelecionado: 'incidente' | 'solicitacao' = 'incidente';
  categoriaSelecionada = '';
  
  arquivoSelecionado: File | null = null;

  isLoading = false;
  mensagemErro = '';
  mensagemSucesso = '';

  // Categorias dinâmicas baseadas no tipo
  get categorias(): string[] {
    if (this.tipoSelecionado === 'incidente') {
      return [
        "Acesso não autorizado detectado",
        "Aplicativo não abre",
        "Computador travando",
        "Computador/monitor não liga",
        "Erro em planilhas",
        "Erro em sistema",
        "Falha no Wi-Fi",
        "Impressora não funciona",
        "Lentidão na Rede",
        "Maquina POS com defeito",
        "Mouse/Teclado/Fone/Caixa de som não funciona",
        "Não consigo enviar email",
        "Outlook não funciona",
        "Problemas com vírus",
        "Problemas de VPN",
        "Problema relacionado a bilhetagem",
        "Ramal não funciona",
        "Sem Internet/Rede"
      ];
    } else {
      return [
        "Alteração Site Urbes",
        "Atualização de software",
        "Configuração de assinatura de email",
        "Configuração de sistema",
        "Criar novo email",
        "Criação de novo usuário de rede",
        "Inclusão em grupo de email",
        "Instalação de aplicativos/programas",
        "Instalação impressora",
        "Liberação de acesso a pastas",
        "Mudança de layout",
        "Novo ponto de rede/ramal",
        "Reset de senha de rede",
        "Solicitação de mouse/teclado/headset",
        "Solicitação de novo computador/notebook",
        "Troca ou upgrade de computador"
      ];
    }
  }

  constructor(
    private chamadoService: ChamadoService,
    private router: Router
  ) {}

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.arquivoSelecionado = event.target.files[0];
    } else {
      this.arquivoSelecionado = null;
    }
  }

  // Reseta a categoria quando muda o tipo
  onTipoChange(): void {
    this.categoriaSelecionada = '';
  }

  async handleNovoChamado() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    
    if (!this.titulo || !this.descricao) {
      this.mensagemErro = 'Por favor, preencha o Título e a Descrição.';
      return;
    }

    if (!this.categoriaSelecionada) {
      this.mensagemErro = 'Por favor, selecione uma categoria.';
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('titulo', this.titulo);
    formData.append('descricao', this.descricao);
    formData.append('tipo', this.tipoSelecionado); // NOVO
    formData.append('categoria', this.categoriaSelecionada); // NOVO
    
    if (this.arquivoSelecionado) {
      formData.append('anexo', this.arquivoSelecionado, this.arquivoSelecionado.name);
    }

    this.chamadoService.criarChamado(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Chamado aberto com sucesso! Redirecionando...';
        
        this.titulo = '';
        this.descricao = '';
        this.tipoSelecionado = 'incidente';
        this.categoriaSelecionada = '';
        this.arquivoSelecionado = null;

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.mensagemErro = err.error?.message || 'Erro ao abrir chamado.';
        console.error(err);
      }
    });
  }
}
