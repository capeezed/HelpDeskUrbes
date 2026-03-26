import { Component, OnInit } from '@angular/core';
import { AvisoService, Aviso } from '../../../services/aviso-service';

@Component({
  selector: 'app-admin-avisos',
  standalone: false,
  templateUrl: './admin-avisos.html'
})
export class AdminAvisos implements OnInit {

  avisos: Aviso[] = [];
  titulo = '';
  mensagem = '';
  tipo: 'info' | 'alerta' | 'critico' = 'info';

  editandoId: number | null = null;

  constructor(private avisoService: AvisoService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar() {
    this.avisoService.listarTodos().subscribe(res => this.avisos = res);
  }

  criar() {
    this.avisoService.criar({
      titulo: this.titulo,
      mensagem: this.mensagem,
      tipo: this.tipo
    }).subscribe(() => {
      this.titulo = '';
      this.mensagem = '';
      this.tipo = 'info';
      this.carregar();
    });
  }

  editar(aviso: Aviso) {
    this.editandoId = aviso.id;
  }

  salvar(aviso: Aviso) {
    this.avisoService.atualizar(aviso.id, {
      titulo: aviso.titulo,
      mensagem: aviso.mensagem,
      tipo: aviso.tipo
    }).subscribe(() => {
      this.editandoId = null;
      this.carregar();
    });
  }

  cancelar() {
    this.editandoId = null;
    this.carregar();
  }

  remover(id: number) {
    if (!confirm('Remover aviso?')) return;

    this.avisoService.remover(id).subscribe(() => {
      this.carregar();
    });
  }
}