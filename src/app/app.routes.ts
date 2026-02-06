import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ClientOnlyGuard } from './guards/client-only.guard';
import { HydrationReadyGuard } from './guards/hydration-ready.guard';
import { AdminMatchGuard } from './guards/admin-match.guard'; // ⬅️ nouveau
import { ManagerMatchGuard } from './guards/manager-match.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },

      // ✅ Page Services : publique (affichage pour tous)
      //    Les actions (ajout/validation) restent visibles/actives uniquement si rôle CLIENT.
      { path: 'services', loadComponent: () => import('./pages/services.component').then(m => m.ServicesComponent) },
      { path: 'avis', loadComponent: () => import('./pages/avis.component').then(m => m.AvisComponent) },
      {
        path: 'services/entretien',
        loadComponent: () => import('./pages/services.component').then(m => m.ServicesComponent),
        data: { tab: 'entretien' },
      },
      {
        path: 'services/mecanique',
        loadComponent: () => import('./pages/services.component').then(m => m.ServicesComponent),
        data: { tab: 'mecanique' },
      },
      {
        path: 'services/pneumatiques',
        loadComponent: () => import('./pages/services.component').then(m => m.ServicesComponent),
        data: { tab: 'pneumatiques' },
      },
      {
        path: 'services/diagnostic',
        loadComponent: () => import('./pages/services.component').then(m => m.ServicesComponent),
        data: { tab: 'diagnostic' },
      },

      { path: 'about', loadComponent: () => import('./pages/about.component').then(m => m.AboutComponent) },
      { path: 'team', loadComponent: () => import('./pages/team.component').then(m => m.TeamComponent) },
      { path: 'history', loadComponent: () => import('./pages/history.component').then(m => m.HistoryComponent) },
      { path: 'values', loadComponent: () => import('./pages/values.component').then(m => m.ValuesComponent) },
      { path: 'contact', loadComponent: () => import('./pages/contact.component').then(m => m.ContactComponent) },

      { path: 'legal', loadComponent: () => import('./pages/legal.component').then(m => m.LegalComponent) },
      { path: 'privacy', loadComponent: () => import('./pages/privacy.component').then(m => m.PrivacyComponent) },
      { path: 'cgv', loadComponent: () => import('./pages/cgv.component').then(m => m.CgvComponent) },

      { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./auth/reset-password.component/reset-password.component').then(
            m => m.ResetPasswordComponent,
          ),
      },

      // ✅ Espace protégé
      {
        path: 'account',
        loadComponent: () => import('./account/account.component/account.component').then(m => m.AccountComponent),
        canActivate: [HydrationReadyGuard, AuthGuard], // client ou admin connecté
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
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
  {
    path: 'manager',
    canMatch: [ManagerMatchGuard],
    loadChildren: () => import('./manager.routes').then(m => m.managerRoutes),
  },

  { path: '**', redirectTo: '' },
];
