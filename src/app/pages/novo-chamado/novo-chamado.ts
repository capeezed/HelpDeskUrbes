import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChamadoService, NovoChamado as NovoChamadoData } from '../../services/chamado';

@Component({
  selector: 'app-novo-chamado',
  standalone: false,
  templateUrl: './novo-chamado.html',
  styleUrls: ['./novo-chamado.css']
})
export class NovoChamado {

  // Variáveis do Formulário (muito mais simples)
  titulo = '';
  descricao = '';
  // Categoria e Prioridade removidos
  arquivoSelecionado: File | null = null;
  // Estado da Página
  isLoading = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private chamadoService: ChamadoService,
    private router: Router
    // Não precisamos mais do DadosGerais!
  ) { }

  // Não precisamos de ngOnInit ou carregarCategorias!

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.arquivoSelecionado = event.target.files[0];
    } else {
      this.arquivoSelecionado = null;
    }
  }

async handleNovoChamado() {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    
    if (!this.titulo || !this.descricao) {
      this.mensagemErro = 'Por favor, preencha o Título e a Descrição.';
      return;
    }

    this.isLoading = true;

    // --- MUDANÇA PRINCIPAL: Construir FormData ---
    const formData = new FormData();
    formData.append('titulo', this.titulo);
    formData.append('descricao', this.descricao);
    
    // Anexa o ficheiro SÓ SE ele foi selecionado
    if (this.arquivoSelecionado) {
      // O nome 'anexo' DEVE ser o mesmo que o backend espera
      // no 'upload.single('anexo')'
      formData.append('anexo', this.arquivoSelecionado, this.arquivoSelecionado.name);
    }
    // ------------------------------------------

    // Chama o serviço atualizado com o FormData
    this.chamadoService.criarChamado(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.mensagemSucesso = 'Chamado aberto com sucesso! Redirecionando...';
        
        this.titulo = '';
        this.descricao = '';
        this.arquivoSelecionado = null;
        // (idealmente, você também resetaria o input type="file" no HTML)

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