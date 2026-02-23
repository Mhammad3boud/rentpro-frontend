import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Platform } from '@ionic/angular';

interface SidebarItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false
})
export class TabsPage implements OnInit, OnDestroy {
  isDesktop = false;
  isTablet = false;
  isMobile = false;
  isSidebarOpen = false;
  currentPath = '';
  private resizeListener: any;
  private routerSubscription: any;
  private backButtonSubscription: any;

  sidebarItems: SidebarItem[] = [
    {
      icon: 'home-outline',
      label: 'Dashboard',
      path: '/tabs/dashboard'
    },
    {
      icon: 'business-outline',
      label: 'Assets',
      path: '/tabs/assets'
    },
    {
      icon: 'people-outline',
      label: 'Tenants',
      path: '/tabs/tenants'
    },
    {
      icon: 'cash-outline',
      label: 'Rent',
      path: '/tabs/rent-tracking'
    },
    {
      icon: 'document-text-outline',
      label: 'Contracts',
      path: '/tabs/contracts'
    },
    {
      icon: 'build-outline',
      label: 'Maintenance',
      path: '/tabs/maintenance'
    }
  ];

  constructor(
    private router: Router,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.resizeListener = () => this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);

    // Set initial sidebar state for desktop
    if (this.isDesktop) {
      this.isSidebarOpen = true;
    }

    // Listen for route changes to update active state
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPath = event.urlAfterRedirects;
      });

    // Set initial path
    this.currentPath = this.router.url;

    // Handle back button on mobile
    this.setupBackButtonHandler();
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  private checkScreenSize() {
    const width = window.innerWidth;
    
    // Update platform flags
    this.isDesktop = width >= 1024;
    this.isTablet = width >= 768 && width < 1024;
    this.isMobile = width < 768;

    // Set sidebar behavior based on platform
    if (this.isDesktop) {
      // Desktop: sidebar open by default but can be toggled
      // Don't force open, keep current state
    } else if (this.isTablet) {
      // Tablets can have sidebar open by default but closable
      this.isSidebarOpen = this.isSidebarOpen; // Keep current state
    } else {
      // Mobile: sidebar closed by default
      this.isSidebarOpen = false;
    }
  }

  private setupBackButtonHandler() {
    // Handle hardware back button on mobile to close sidebar
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(
      10,
      () => {
        if (this.isMobile && this.isSidebarOpen) {
          this.isSidebarOpen = false;
          return; // Prevent default back action
        }
      }
    );
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  selectItem(path: string) {
    this.router.navigate([path]);
    
    // Close sidebar on mobile and tablet after selection
    if (!this.isDesktop) {
      this.isSidebarOpen = false;
    }
  }

  isActive(path: string): boolean {
    return this.currentPath.includes(path);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
    if (!this.isDesktop) {
      this.isSidebarOpen = false;
    }
  }

  // Get platform-specific CSS classes
  get platformClasses() {
    return {
      'desktop': this.isDesktop,
      'tablet': this.isTablet,
      'mobile': this.isMobile,
      'sidebar-open': this.isSidebarOpen,
      'sidebar-closed': !this.isSidebarOpen
    };
  }

  // Handle swipe gestures
  handleSwipe(event: any) {
    if (this.isMobile) {
      if (event.direction === 2) { // Swipe right (from left edge)
        this.isSidebarOpen = true;
      }
    }
  }

  handleSidebarSwipe(event: any) {
    if (this.isMobile && this.isSidebarOpen) {
      if (event.direction === 4) { // Swipe left
        this.isSidebarOpen = false;
      }
    }
  }
}
