import { Routes } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout.component';
import { ManagerDashboardComponent } from './dashboard/manager-dashboard.component';
import { AdminDemandesComponent } from './features/admin-demandes.component';
import { AdminClientsComponent } from './features/admin-clients.component';
import { AdminCalendarComponent } from './features/admin-calendar.component';
import { ManagerGuard } from './guards/manager.guard';

export const managerRoutes: Routes = [
  {
    path: '',
    component: ManagerLayoutComponent,
    canActivate: [ManagerGuard],
    children: [
      {
        path: '',
        component: ManagerDashboardComponent,
        data: { title: 'Tableau de bord' },
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
        path: 'calendrier',
        component: AdminCalendarComponent,
        data: { title: 'Calendrier' },
      },
    ],
  },
];
