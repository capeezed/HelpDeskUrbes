import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
// 1. Caminho do serviço corrigido
import { Chamado, ChamadoService } from '../../services/chamado';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {

  // 2. Tipo corrigido de Promise para Observable
  chamados$!: Observable<Chamado[]>;

  // 3. Nome da variável no construtor corrigido (convenção)
  constructor(private chamadoService: ChamadoService) { }

  ngOnInit(): void {
    // Esta linha agora funciona, pois os tipos (Observable) batem
    this.chamados$ = this.chamadoService.getMeusChamados();
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
