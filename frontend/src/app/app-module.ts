import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthHttpInterceptor } from './services/auth-http-interceptor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';

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
import { Estoque } from './pages/admin/estoque/estoque';
import { AdminUsuarios } from './pages/admin/admin-usuarios/admin-usuarios';
import { AdminAvisos } from './pages/admin/adminavisos/admin-avisos';
import { Dash } from './pages/admin/dash/dash';
import { NovoChamadoUsuario } from './pages/admin/novo-chamado-usuario/novo-chamado-usuario';
import { EsqueciSenha } from './pages/auth/esqueci-senha/esqueci-senha';
import { ResetPassword } from './pages/auth/reset-password/reset-password';
import { AnotacoesTecnicas } from './pages/admin/anotacoes-tecnicas/anotacoes-tecnicas';

@NgModule({
  declarations: [
    App,
    Login,
    Cadastro,
    Dashboard,
    Header,
    DetalheChamado,
    DetalheChamadoUser,
    FilaChamados,
    Secure,
    Estoque,
    AdminUsuarios,
    AdminAvisos,
    Dash,
    NovoChamadoUsuario,
    AnotacoesTecnicas,
    EsqueciSenha,
    ResetPassword
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    NgbModule,
    HttpClientModule,
    NovoChamado,
    
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      timeOut: 5000,
      progressBar: true,
      closeButton: true
    }),

  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule { }
