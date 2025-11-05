import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthHttpInterceptor } from './services/auth-http-interceptor';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './pages/user/login/login';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Cadastro } from './pages/user/cadastro/cadastro';
import { Dashboard } from './pages/user/dashboard/dashboard';
import { Secure } from './layout/secure/secure';
import { Header } from './components/header/header';
import { NovoChamado } from './pages/user/novo-chamado/novo-chamado';
import { FilaChamados } from './pages/admin/fila-chamados/fila-chamados';
import { DetalheChamado } from './pages/admin/detalhe-chamado/detalhe-chamado';
import { DetalheChamadoUser } from './pages/user/detalhe-chamadoUser/detalhe-chamado-user';

@NgModule({
  declarations: [
    App,
    Login,
    Cadastro,
    Dashboard,
    Secure,
    Header,
    FilaChamados,
    DetalheChamadoUser
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgbModule,
    HttpClientModule,
    NovoChamado,
    DetalheChamado
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule { }
