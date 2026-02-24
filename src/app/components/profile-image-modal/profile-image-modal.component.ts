import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-profile-image-modal',
  templateUrl: './profile-image-modal.component.html',
  styleUrls: ['./profile-image-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ProfileImageModalComponent {
  @Input() imageUrl: string = '';

  constructor(private modalController: ModalController) {}

  closeModal() {
    this.modalController.dismiss();
  }
}