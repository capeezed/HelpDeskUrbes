// src/app/services/navegacao-chamados.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavegacaoChamadosService {
  private chamadosIds: number[] = [];

  setListaChamados(ids: number[]): void {
    this.chamadosIds = ids;
  }

  getListaChamados(): number[] {
    return this.chamadosIds;
  }

  getProximoId(idAtual: number): number | undefined {
    const index = this.chamadosIds.indexOf(idAtual);
    return this.chamadosIds[index + 1];
  }

  getAnteriorId(idAtual: number): number | undefined {
    const index = this.chamadosIds.indexOf(idAtual);
    return this.chamadosIds[index - 1];
  }
}
