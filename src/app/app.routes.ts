// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { HomeComponent } from './pages/home.component';
import { ServicesComponent } from './pages/services.component';
import { ClientDashboardComponent } from './dashboard/client-dashboard.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { ResetPasswordComponent } from './auth/reset-password.component/reset-password.component';
import { AccountComponent } from './account/account.component/account.component';

import { AuthGuard } from './guards/auth.guard';
import { ClientOnlyGuard } from './guards/client-only.guard';
import { HydrationReadyGuard } from './guards/hydration-ready.guard';
import { AdminMatchGuard } from './guards/admin-match.guard'; // ⬅️ nouveau

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent },

      // ✅ Page Services : publique (affichage pour tous)
      //    Les actions (ajout/validation) restent visibles/actives uniquement si rôle CLIENT.
      { path: 'services', component: ServicesComponent },

      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'reset-password', component: ResetPasswordComponent },

      // ✅ Espace protégé
      {
        path: 'account',
        component: AccountComponent,
        canActivate: [HydrationReadyGuard, AuthGuard], // client ou admin connecté
      },
      {
        path: 'dashboard',
        component: ClientDashboardComponent,
        canActivate: [HydrationReadyGuard, AuthGuard, ClientOnlyGuard], // uniquement clients
      },
    ],
  },

  // ✅ Back-office en lazy, bloqué au *match* si pas ADMIN (évite de charger le bundle)
  {
    path: 'admin',
    canMatch: [AdminMatchGuard],
    loadChildren: () => import('./admin.routes').then(m => m.adminRoutes),
  },

  { path: '**', redirectTo: '' },
];
