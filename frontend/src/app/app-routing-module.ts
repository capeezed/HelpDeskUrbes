import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './pages/user/login/login';
import { Cadastro } from './pages/user/cadastro/cadastro';
import { Dashboard } from './pages/user/dashboard/dashboard';
import { Secure } from './layout/secure/secure';
import { AuthGuard } from './services/auth-guard';
import { NovoChamado } from './pages/user/novo-chamado/novo-chamado';
import { TecnicoGuard } from './services/tecnico-guard';
import { FilaChamados } from './pages/admin/fila-chamados/fila-chamados';
import { DetalheChamado } from './pages/admin/detalhe-chamado/detalhe-chamado';
import { DetalheChamadoUser } from './pages/user/detalhe-chamadoUser/detalhe-chamado-user';
import { Estoque } from './pages/admin/estoque/estoque';
import { AdminUsuarios } from './pages/admin/admin-usuarios/admin-usuarios';
import { AdminAvisos } from './pages/admin/adminavisos/admin-avisos';
import { Dash } from './pages/admin/dash/dash';
import { NovoChamadoUsuario } from './pages/admin/novo-chamado-usuario/novo-chamado-usuario';
import { AnotacoesTecnicas } from './pages/admin/anotacoes-tecnicas/anotacoes-tecnicas';

import { EsqueciSenha } from './pages/auth/esqueci-senha/esqueci-senha';

import { ResetPassword } from './pages/auth/reset-password/reset-password';


const routes: Routes = [

  { path: 'login', component: Login },

  { path: 'cadastro', component: Cadastro },

  {
    path: 'esqueci-senha',
    component: EsqueciSenha
  },


  {
    path: 'reset-password/:token',
    component: ResetPassword
  },
  

  {
    path: '',
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

      {
        path: 'meus-chamados/detalhe/:id',
        component: DetalheChamadoUser
      }
    ]
  },

  {
    path: 'admin',
    canActivate: [TecnicoGuard],
    children: [

      {
        path: 'fila',
        component: FilaChamados
      },

      {
        path: 'novo-chamado-usuario',
        component: NovoChamadoUsuario
      },

      {
        path: 'chamado/:id',
        component: DetalheChamado
      }
    ]
  },

  {
    path: 'admin/estoque',
    component: Estoque,
    canActivate: [AuthGuard, TecnicoGuard]
  },

  {
    path: 'admin/usuarios',
    component: AdminUsuarios,
    canActivate: [AuthGuard, TecnicoGuard]
  },

  {
    path: 'admin/admin-avisos',
    component: AdminAvisos,
    canActivate: [AuthGuard, TecnicoGuard]
  },

  {
    path: 'admin/dash',
    component: Dash,
    canActivate: [AuthGuard, TecnicoGuard]
  },

  {
    path: 'admin/anotacoes-tecnicas',
    component: AnotacoesTecnicas,
    canActivate: [AuthGuard, TecnicoGuard]
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
