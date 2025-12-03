import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './pages/user/login/login';
import { Cadastro } from './pages/user/cadastro/cadastro';
import { Dashboard } from './pages/user/dashboard/dashboard';
import { Secure } from './layout/secure/secure';
import { AuthGuard } from './services/auth-guard';
import { NovoChamado } from './pages/user/novo-chamado/novo-chamado'
import { TecnicoGuard } from './services/tecnico-guard';
import { FilaChamados } from './pages/admin/fila-chamados/fila-chamados';
import { DetalheChamado } from './pages/admin/detalhe-chamado/detalhe-chamado';
import { DetalheChamadoUser } from './pages/user/detalhe-chamadoUser/detalhe-chamado-user';
import { Estoque } from './pages/admin/estoque/estoque'

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
      },
      { path: 'meus-chamados/detalhe/:id', 
        component: DetalheChamadoUser 
      }
    ]
  },
  {
    path: 'admin',
        canActivate: [TecnicoGuard], // 2. PROTEGIDO PELO NOVO GUARD
        children: [
          { path: 'fila', component: FilaChamados },
          { path: 'chamado/:id', component: DetalheChamado }
        ]
  },

  // src/app/app-routing.module.ts ou similar
  {
    path: 'admin/estoque',
    component: Estoque,
    canActivate: [AuthGuard, TecnicoGuard] // se você tiver guard de técnico
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
