import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboardservice';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dash',
  templateUrl: './dash.html',
  styleUrls: ['./dash.css'],
  standalone: false
})
export class Dash implements OnInit {

  totalRelatorios = 0;
  totalAbertos = 0;
  totalFechados = 0;

  mes: string | number = '';
  ano = new Date().getFullYear();

  meses = [
    { nome: 'Janeiro', valor: 1 },
    { nome: 'Fevereiro', valor: 2 },
    { nome: 'Março', valor: 3 },
    { nome: 'Abril', valor: 4 },
    { nome: 'Maio', valor: 5 },
    { nome: 'Junho', valor: 6 },
    { nome: 'Julho', valor: 7 },
    { nome: 'Agosto', valor: 8 },
    { nome: 'Setembro', valor: 9 },
    { nome: 'Outubro', valor: 10 },
    { nome: 'Novembro', valor: 11 },
    { nome: 'Dezembro', valor: 12 }
  ];

  anos = [2024, 2025, 2026];

  chartCategoria: any;
  chartStatus: any;

  relatorios: any[] = [];
  relatorioSelecionado: any = null;

  constructor(private dashService: DashboardService) {}

  ngOnInit(): void {
    this.carregarTudo();
  }

  carregarTudo() {
    this.carregarGraficos();
    this.carregarRelatorios();
  }

  carregarGraficos() {
    this.dashService.totalRelatorios(this.mes, this.ano)
      .subscribe(r => this.totalRelatorios = r.total || 0);

    this.dashService.chamadosPorCategoria(this.mes, this.ano)
      .subscribe(dados => {
        if (this.chartCategoria) this.chartCategoria.destroy();

        this.chartCategoria = new Chart('graficoCategoria', {
          type: 'bar',
          data: {
            labels: dados.map(d => d.categoria),
            datasets: [{
              label: 'Chamados',
              data: dados.map(d => d.total)
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      });

    this.dashService.chamadosPorStatus(this.mes, this.ano)
      .subscribe(dados => {
        if (this.chartStatus) this.chartStatus.destroy();

        this.chartStatus = new Chart('graficoStatus', {
          type: 'pie',
          data: {
            labels: dados.map(d => d.status),
            datasets: [{
              data: dados.map(d => d.total)
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });

        this.totalAbertos = dados.find(d => d.status === 'aberto')?.total || 0;
        this.totalFechados = dados.find(d => d.status === 'fechado')?.total || 0;
      });
  }

  carregarRelatorios() {
    this.dashService.listarRelatorios(this.mes, this.ano)
      .subscribe(dados => this.relatorios = dados || []);
  }

  abrirRelatorio(rel: any) {
    this.relatorioSelecionado = rel;
  }

  fecharRelatorio() {
    this.relatorioSelecionado = null;
  }
}
