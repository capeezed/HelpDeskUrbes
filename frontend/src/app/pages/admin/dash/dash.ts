import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboardservice';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  anos = [2026, 2027, 2028, 2029, 2030];
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

  exportarPDF() {
  const mesNome = this.mes
    ? this.meses.find(m => m.valor === +this.mes)?.nome
    : 'Todos';

  this.dashService.chamadosPorCategoria(this.mes, this.ano).subscribe(categorias => {
    const doc = new jsPDF();

    // ── Cabeçalho ──────────────────────────────────────────
    doc.setFillColor(40, 116, 166);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Relatório de Chamados por Categoria', 14, 13);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    // ── Período ─────────────────────────────────────────────
    doc.setTextColor(40);
    doc.setFontSize(11);
    doc.text(`Período: ${mesNome} / ${this.ano}`, 14, 38);

    // ── Top 3 categorias ────────────────────────────────────
    const top3 = [...categorias]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    doc.setFontSize(13);
    doc.setTextColor(40, 116, 166);
    doc.text('Top 3 Categorias com Mais Chamados', 14, 48);

    const medalhas = ['', '', ''];
    top3.forEach((cat, i) => {
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.text(
        `${medalhas[i]}  ${i + 1}º  ${cat.categoria}  —  ${cat.total} chamado(s)`,
        18,
        57 + i * 8
      );
    });

    // ── Tabela de chamados por categoria ────────────────────
    doc.setFontSize(13);
    doc.setTextColor(40, 116, 166);
    doc.text('Chamados por Categoria', 14, 88);

    autoTable(doc, {
      startY: 92,
      head: [['#', 'Categoria', 'Total']],
      body: categorias
        .sort((a, b) => b.total - a.total)
        .map((c, i) => [i + 1, c.categoria, c.total]),
      headStyles: { fillColor: [40, 116, 166] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        2: { halign: 'center' }
      }
    });

    // ── Gráfico de barras (captura do canvas) ───────────────
    const canvas = document.getElementById('graficoCategoria') as HTMLCanvasElement;
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Se não couber na página atual, adiciona nova página
      const alturaGrafico = 80;
      if (finalY + alturaGrafico > 280) {
        doc.addPage();
        doc.setFontSize(13);
        doc.setTextColor(40, 116, 166);
        doc.text('Gráfico — Chamados por Categoria', 14, 20);
        doc.addImage(imgData, 'PNG', 14, 25, 180, alturaGrafico);
      } else {
        doc.setFontSize(13);
        doc.setTextColor(40, 116, 166);
        doc.text('Gráfico — Chamados por Categoria', 14, finalY);
        doc.addImage(imgData, 'PNG', 14, finalY + 5, 180, alturaGrafico);
      }
    }

    doc.save(`relatorios_${mesNome}_${this.ano}.pdf`);
  });
}
}