import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

export interface SidebarItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() items: SidebarItem[] = [];
  @Input() activePath: string = '';
  @Output() itemSelected = new EventEmitter<string>();

  isDesktop = false;
  isSidebarOpen = false;
  private resizeListener: any;

  constructor(
    private router: Router,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.resizeListener = () => this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth >= 768;
    if (this.isDesktop) {
      this.isSidebarOpen = true;
    } else {
      this.isSidebarOpen = false;
    }
  }

  selectItem(path: string) {
    this.itemSelected.emit(path);
    this.router.navigate([path]);
    
    // Close sidebar on mobile after selection
    if (!this.isDesktop) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  isActive(path: string): boolean {
    return this.activePath.includes(path);
  }
}
