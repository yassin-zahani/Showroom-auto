import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGaugeHigh, faHeart } from '@fortawesome/free-solid-svg-icons';
import { Auto } from '../../interfaces/auto';


@Component({
  imports: [CurrencyPipe, FontAwesomeModule],
  selector: 'app-car-card',
  styleUrl: './car-card.css',
  templateUrl: './car-card.html',
})
export class CarCard {
  readonly faHeart = faHeart;
  readonly faGaugeHigh = faGaugeHigh;

  @Input({ required: true }) car!: Auto;
  @Input() isFavorite = false;

  @Output() favoriteToggle = new EventEmitter<Auto>();
  @Output() detailsOpen = new EventEmitter<Auto>();

  get lowStock(): boolean {
    return this.car.availability <= 3;
  }
}
