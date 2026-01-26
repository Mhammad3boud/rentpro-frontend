import { Injectable } from '@angular/core';

interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'overdue';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  iconColor: 'success' | 'primary' | 'warning' | 'danger';
}

interface UpcomingReminder {
  id: string;
  type: 'lease' | 'maintenance' | 'rent' | 'inspection';
  title: string;
  description: string;
  date: Date;
  icon: string;
  iconColor: 'warning' | 'primary' | 'success' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor() { }

  getMaintenanceTasks() {
    return [
      {
        id: 'M-001',
        title: 'HVAC System Inspection',
        description: 'Quarterly HVAC system check and filter replacement',
        assetId: 'P-456',
        assetName: 'Business District, Downtown',
        priority: 'high',
        status: 'pending',
        scheduledDate: new Date('2024-02-01'),
        category: 'hvac',
        recurring: {
          frequency: 'monthly',
          interval: 3
        },
        estimatedCost: 150
      },
      {
        id: 'M-002',
        title: 'Plumbing Leak Repair',
        description: 'Fix leaking pipe in bathroom',
        assetId: 'P-456',
        assetName: 'Business District, Downtown',
        priority: 'critical',
        status: 'in-progress',
        scheduledDate: new Date('2024-01-25'),
        assignedTo: 'John Plumbing Services',
        estimatedCost: 300,
        category: 'plumbing'
      }
    ];
  }

  getAssets() {
    return [
      {
        type: 'Property',
        id: 'P-456',
        location: 'Business District, Downtown',
        owner: 'John Watson',
        phone: '+1-555-0123',
        usage: 'Rented',
        block: 'A-12/P-456',
      },
      {
        type: 'Farm',
        id: 'P-789',
        location: 'Agricultural Zone, Countryside',
        owner: 'Sarah Johnson',
        phone: '+1-555-0456',
        usage: 'Personal Use',
        block: 'F-08/P-789',
      },
      {
        type: 'Farm',
        id: 'P-811',
        location: 'Agricultural Zone, Countryside',
        owner: 'Mohammed Aboud',
        phone: '+1-555-0456',
        usage: 'Business',
        block: 'F-10/P-811',
      }
    ];
  }

  getContracts() {
    return [
      {
        id: 'CNT-2024-001',
        tenant: 'Alice Johnson',
        property: 'P-456/2A',
        startDate: '2024-01-15',
        endDate: '2024-12-31',
        rent: 1200,
        deposit: 2400,
        generated: '2024-01-10',
        status: 'Active',
      },
      {
        id: 'CNT-2024-002',
        tenant: 'Michael Chen',
        property: 'P-789/5B',
        startDate: '2024-03-01',
        endDate: '2025-02-28',
        rent: 1500,
        deposit: 3000,
        generated: '2024-02-25',
        status: 'Active',
      },
      {
        id: 'CNT-2024-003',
        tenant: 'Emma Wilson',
        property: 'P-123/3C',
        startDate: '2024-06-01',
        endDate: '2025-05-31',
        rent: 1800,
        deposit: 3600,
        generated: '2024-05-25',
        status: 'Active',
      }
    ];
  }

  getRecentActivities(): RecentActivity[] {
    const maintenanceTasks = this.getMaintenanceTasks();
    const contracts = this.getContracts();
    const assets = this.getAssets();

    const activities: RecentActivity[] = [];

    maintenanceTasks.forEach(task => {
      if (task.status === 'in-progress') {
        activities.push({
          id: `maint-${task.id}`,
          type: 'maintenance' as const,
          title: 'Maintenance in progress',
          description: `${task.title} at ${task.assetName}`,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          icon: 'build-outline',
          iconColor: 'primary'
        });
      }

      if (task.status === 'completed') {
        activities.push({
          id: `maint-comp-${task.id}`,
          type: 'maintenance' as const,
          title: 'Maintenance completed',
          description: `${task.title} at ${task.assetName}`,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          icon: 'checkmark-circle',
          iconColor: 'success'
        });
      }
    });

    contracts.forEach(contract => {
      if (contract.status === 'Active') {
        activities.push({
          id: `lease-${contract.id}`,
          type: 'lease' as const,
          title: 'New lease signed',
          description: `${contract.tenant} - ${contract.property}`,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          icon: 'document-text',
          iconColor: 'success'
        });
      }
    });

    activities.push({
      id: 'payment-001',
      type: 'payment' as const,
      title: 'Rent payment received',
      description: 'Unit 2A - TZS 500,000',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: 'checkmark-circle',
      iconColor: 'success'
    });

    activities.push({
      id: 'overdue-001',
      type: 'overdue' as const,
      title: 'Rent payment overdue',
      description: 'Unit 5B - 3 days late',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      icon: 'time-outline',
      iconColor: 'warning'
    });

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
  }

  getUpcomingReminders(): UpcomingReminder[] {
    const maintenanceTasks = this.getMaintenanceTasks();
    const contracts = this.getContracts();
    const now = new Date();

    const reminders: UpcomingReminder[] = [];

    maintenanceTasks.forEach(task => {
      if (task.status === 'pending' && task.scheduledDate > now) {
        reminders.push({
          id: `maint-rem-${task.id}`,
          type: 'maintenance' as const,
          title: 'Scheduled Maintenance',
          description: `${task.title} at ${task.assetName}`,
          date: task.scheduledDate,
          icon: 'build-outline',
          iconColor: 'primary'
        });
      }
    });

    contracts.forEach(contract => {
      const endDate = new Date(contract.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        reminders.push({
          id: `lease-exp-${contract.id}`,
          type: 'lease' as const,
          title: 'Lease Expiring Soon',
          description: `${contract.property} - ${contract.tenant}`,
          date: endDate,
          icon: 'alert-circle-outline',
          iconColor: 'warning'
        });
      }
    });

    const nextRentDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    reminders.push({
      id: 'rent-due-001',
      type: 'rent' as const,
      title: 'Rent Due Soon',
      description: `${contracts.length} properties have rent due`,
      date: nextRentDue,
      icon: 'cash-outline',
      iconColor: 'warning'
    });

    return reminders.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }
}
