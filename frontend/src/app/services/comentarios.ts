import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComentariosService {

  private apiUrl = 'http://172.16.8.18:3000/api/chamados';

  constructor(private http: HttpClient) {}

  getComentarios(chamadoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${chamadoId}/comentarios`);
  }

  enviarComentario(chamadoId: number, texto: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${chamadoId}/comentarios`, { texto });
  }
}
