import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { NotificationsService } from './notification.service';
import { ActivityService } from './activity.service';
import { UserService } from './user.service';
import { LeaseService } from './lease.service';
import { PaymentService } from './payments.service';
import { MaintenanceService } from './maintenance.service';
import { AiPredictionService } from './ai-prediction.service';

@Injectable({ providedIn: 'root' })
export class SessionWarmupService {
  constructor(
    private userService: UserService,
    private dashboardService: DashboardService,
    private notificationsService: NotificationsService,
    private activityService: ActivityService,
    private leaseService: LeaseService,
    private paymentService: PaymentService,
    private maintenanceService: MaintenanceService,
    private aiPredictionService: AiPredictionService
  ) {}

  warmupAfterLogin(): void {
    const isTenant = this.userService.isTenant();

    const safe = <T>(p: Promise<T>) => p.catch(() => null);

    const requests = [
      isTenant
        ? safe(firstValueFrom(this.dashboardService.getTenantDashboard()))
        : safe(firstValueFrom(this.dashboardService.getOwnerDashboard())),
      safe(firstValueFrom(this.notificationsService.getUnread())),
      safe(firstValueFrom(this.activityService.getRecentActivities())),
      isTenant
        ? safe(firstValueFrom(this.leaseService.getTenantLeases()))
        : safe(firstValueFrom(this.leaseService.getMyLeases())),
      isTenant
        ? safe(firstValueFrom(this.paymentService.getTenantPayments()))
        : Promise.resolve(null),
      isTenant
        ? safe(firstValueFrom(this.maintenanceService.getMyRequests()))
        : safe(firstValueFrom(this.maintenanceService.getPropertyRequests())),
      safe(firstValueFrom(this.aiPredictionService.getDashboardSummary(isTenant ? 'TENANT' : 'OWNER')))
    ];

    void Promise.all(requests);
  }
}
