import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminServicesComponent } from './features/admin-services.component';
import { AdminDemandesComponent } from './features/admin-demandes.component';
import { AdminPromotionsComponent } from './features/admin-promotions.component';
import { AdminClientsComponent } from './features/admin-clients.component';
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
        path: 'promotions',
        component: AdminPromotionsComponent,
        data: { title: 'Promotions' },
      },
    ],
  },
];
