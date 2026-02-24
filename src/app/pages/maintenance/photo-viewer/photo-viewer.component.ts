import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-photo-viewer',
    template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Maintenance Media</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="media-gallery">
        <div *ngFor="let url of photoUrls; let i = index" class="media-item">
          <ng-container *ngIf="isVideo(url); else imageTemplate">
            <video [src]="url" controls playsinline class="video-player">
              Your browser does not support the video tag.
            </video>
            <p class="media-label">Video {{ i + 1 }}</p>
          </ng-container>
          <ng-template #imageTemplate>
            <img [src]="url" [alt]="'Photo ' + (i + 1)" />
            <p class="media-label">Photo {{ i + 1 }}</p>
          </ng-template>
        </div>
      </div>
      <div *ngIf="photoUrls.length === 0" class="empty-state">
        <ion-icon name="images-outline"></ion-icon>
        <p>No media available</p>
      </div>
    </ion-content>
  `,
    styles: [`
    .media-gallery {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 8px;
    }
    
    .media-item {
      text-align: center;
      
      img, .video-player {
        max-width: 100%;
        max-height: 400px;
        object-fit: contain;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .video-player {
        width: 100%;
        background: #000;
      }
      
      .media-label {
        margin-top: 8px;
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: var(--ion-color-medium);
      
      ion-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
    }
  `],
    standalone: true,
    imports: [CommonModule, IonicModule]
})
export class PhotoViewerComponent {
    @Input() photoUrls: string[] = [];

    private videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', '3gp'];

    constructor(private modalCtrl: ModalController) { }

    isVideo(url: string): boolean {
        const extension = url.split('.').pop()?.toLowerCase() || '';
        return this.videoExtensions.includes(extension);
    }

    close() {
        this.modalCtrl.dismiss();
    }
}
