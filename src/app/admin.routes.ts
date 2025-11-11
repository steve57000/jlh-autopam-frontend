import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminServicesComponent } from './features/admin-services.component';
import { AdminDemandesComponent } from './features/admin-demandes.component';
import { AdminPromotionsComponent } from './features/admin-promotions.component';
import { AdminGuard } from './guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: '',           component: AdminDashboardComponent },
      { path: 'services',   component: AdminServicesComponent },
      { path: 'demandes',   component: AdminDemandesComponent },
      { path: 'promotions', component: AdminPromotionsComponent },
    ],
  },
];
