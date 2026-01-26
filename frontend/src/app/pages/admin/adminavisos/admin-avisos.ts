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
      this.carregar();
    });
  }

  remover(id: number) {
    if (!confirm('Remover aviso?')) return;
    this.avisoService.remover(id).subscribe(() => this.carregar());
  }
}
