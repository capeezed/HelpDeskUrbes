import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ComentariosService {

  private apiUrl = 'http://191.242.225.226:300/api/chamados';

  constructor(private http: HttpClient) {}

  getComentarios(chamadoId: number): Observable<any[]> {
  console.log('🔍 Buscando comentários do chamado', chamadoId);
  return this.http.get<any[]>(`http://191.242.225.226:300/api/chamados/${chamadoId}/comentarios`);
}


  enviarComentario(chamadoId: number, texto: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${chamadoId}/comentarios`, { texto });
  }

  
}
