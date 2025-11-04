import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
// 1. Importe o Serviço e a Interface que já criamos
import { Chamado, ChamadoService } from '../../services/chamado';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {

  // 2. Criamos um Observable para a lista de chamados
  //    O '!' diz ao TypeScript que vamos inicializá-la no ngOnInit
  chamados$!: Promise<Chamado[]>;

  // 3. Injete o ChamadoService
  constructor(private ChamadoService: ChamadoService) { }

  ngOnInit(): void {
    // 4. Ao iniciar o componente, buscamos os chamados do usuário
    //    O service já sabe quem é o usuário logado (via AuthService)
    this.chamados$ = this.ChamadoService.getMeusChamados();
  }

  // 5. Função para retornar classes CSS do Bootstrap baseadas no status
  getStatusClass(status: string | undefined) {
    switch (status) {
      case 'aberto':
        return 'bg-success text-white'; // Verde para aberto
      case 'em_andamento':
        return 'bg-warning text-dark'; // Amarelo para em andamento
      case 'resolvido':
      case 'fechado':
        return 'bg-secondary text-white'; // Cinza para fechado
      default:
        return 'bg-light text-dark'; // Padrão
    }
  }
}