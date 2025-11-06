import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Pega o token do localStorage
    const token = localStorage.getItem('auth-token'); 

    if (token) {
      // Se o token existir, clona a requisição e adiciona o
      // header 'Authorization'
      const clonedReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(clonedReq);
    } else {
      // Se não houver token, envia a requisição original
      return next.handle(request);
    }
  }
}