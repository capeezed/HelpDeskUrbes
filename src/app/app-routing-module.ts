import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Cadastro } from './pages/cadastro/cadastro';
import { Dashboard } from './pages/dashboard/dashboard';
import { Secure } from './layout/secure/secure';
import { AuthGuard } from './services/auth-guard';
import { NovoChamado } from './pages/novo-chamado/novo-chamado'

const routes: Routes = [
  { path: 'login', component: Login},
  { path: 'cadastro', component: Cadastro},

  { path: '', 
    component: Secure,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'novo-chamado',
        component: NovoChamado
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
