import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './pages/login/login';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Cadastro } from './pages/cadastro/cadastro';
import { Dashboard } from './pages/dashboard/dashboard';
import { Secure } from './layout/secure/secure';
import { Header } from './components/header/header';
import { NovoChamado } from './pages/novo-chamado/novo-chamado';

@NgModule({
  declarations: [
    App,
    Login,
    Cadastro,
    Dashboard,
    Secure,
    Header,
    NovoChamado
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgbModule,
    HttpClientModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
