// src/app/pages/novo-chamado/novo-chamado.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChamadoService, NovoChamado as NovoChamadoData } from '../../services/chamado';

// --- CORRECÇÃO ESTÁ AQUI ---
import { CommonModule } from '@angular/common';   // Para *ngIf, *ngFor, [ngClass]
import { FormsModule } from '@angular/forms';     // Para [(ngModel)]

@Component({
  selector: 'app-novo-chamado',
  // 1. Marque como standalone
  standalone: true,
  // 2. Importe os módulos
  imports: [
    CommonModule, // <-- Corrige *ngIf
    FormsModule   // <-- Corrige [(ngModel)]
  ],
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
export class NovoChamado {

  // Variáveis do Formulário (simplificadas)
  titulo = '';
  descricao = '';
  
  // Para o upload de ficheiro
  arquivoSelecionado: File | null = null;

  // Estado da Página
  isLoading = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private chamadoService: ChamadoService,
    private router: Router
  ) { }

  // Função para capturar o ficheiro selecionado
  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.arquivoSelecionado = event.target.files[0];
    } else {
      this.arquivoSelecionado = null;
    }
  }

  // Função de submit
  async handleNovoChamado() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    
    if (!this.titulo || !this.descricao) {
      this.mensagemErro = 'Por favor, preencha o Título e a Descrição.';
      return;
    }

    this.isLoading = true;

    // Construir o FormData
    const formData = new FormData();
    formData.append('titulo', this.titulo);
    formData.append('descricao', this.descricao);
    
    if (this.arquivoSelecionado) {
      formData.append('anexo', this.arquivoSelecionado, this.arquivoSelecionado.name);
    }

    // Chamar o serviço
    this.chamadoService.criarChamado(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Chamado aberto com sucesso! Redirecionando...';
        
        this.titulo = '';
        this.descricao = '';
        this.arquivoSelecionado = null;
        // TODO: Limpar o input de ficheiro (é um pouco mais chato)

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