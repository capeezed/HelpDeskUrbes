import { Component, OnInit } from '@angular/core';
import { WebsocketService } from '../../services/websocket';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-secure',
  templateUrl: './secure.html',
  styleUrls: ['./secure.css']
})
export class Secure implements OnInit {

  constructor(
    private ws: WebsocketService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.ws.conectar();

    this.ws.onNovoChamado(data => {
      this.toastr.info(`Novo chamado: ${data.titulo}`, '📌 Novo chamado');
    });

    this.ws.onChamadoAtribuido(data => {
      this.toastr.success(`Você foi atribuído ao chamado #${data.chamadoId}`, '👷 Chamado atribuído');
    });

    this.ws.onStatusAlterado(data => {
      this.toastr.warning(`Novo status: ${data.status}`, `Chamado #${data.chamadoId}`);
    });

    this.ws.onNovoComentario(data => {
      this.toastr.info(`${data.autor}: ${data.texto}`, `💬 Comentário no chamado #${data.chamadoId}`);
    });
  }
}
