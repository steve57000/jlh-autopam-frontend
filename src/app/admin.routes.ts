import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminServicesComponent } from './features/admin-services.component';
import { AdminDemandesComponent } from './features/admin-demandes.component';
import { AdminPromotionsComponent } from './features/admin-promotions.component';
import { AdminClientsComponent } from './features/admin-clients.component';
import { AdminServiceIconsComponent } from './features/admin-service-icons.component';
import { AdminUsersComponent } from './features/admin-users.component';
import { AdminGuard } from './guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: '',
        component: AdminDashboardComponent,
        data: { title: 'Tableau de bord' },
      },
      {
        path: 'services',
        component: AdminServicesComponent,
        data: { title: 'Gestion des services' },
      },
      {
        path: 'icons',
        component: AdminServiceIconsComponent,
        data: { title: 'Gestion des icônes' },
      },
      {
        path: 'demandes',
        component: AdminDemandesComponent,
        data: { title: 'Demandes clients' },
      },
      {
        path: 'clients',
        component: AdminClientsComponent,
        data: { title: 'Clients' },
      },
      {
        path: 'utilisateurs',
        component: AdminUsersComponent,
        data: { title: 'Utilisateurs' },
      },
      {
        path: 'promotions',
        component: AdminPromotionsComponent,
        data: { title: 'Promotions' },
      },
    ],
  },
];
