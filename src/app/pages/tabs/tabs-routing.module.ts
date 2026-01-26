import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'assets',
        loadChildren: () =>
          import('../assets/assets.module').then(m => m.AssetsPageModule)
      },
      {
        path: 'tenants',
        loadChildren: () =>
          import('../tenants/tenants.module').then(m => m.TenantsPageModule)
      },
      {
        path: 'rent-tracking',
        loadChildren: () =>
          import('../rent-tracking/rent-tracking.module').then(m => m.RentTrackingPageModule)
      },
      {
        path: 'contracts',
        loadChildren: () =>
          import('../contracts/contracts.module').then(m => m.ContractsPageModule)
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('../maintenance/maintenance.module').then(m => m.MaintenancePageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
