import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCarSide, faHeart } from '@fortawesome/free-solid-svg-icons';

@Component({
  imports: [FontAwesomeModule],
  selector: 'app-head-bar',
  styleUrl: './head-bar.css',
  templateUrl: './head-bar.html',
})
export class HeadBar {
  readonly faCarSide = faCarSide;
  readonly faHeart = faHeart;

  @Input() favoritesCount = 0;
  @Input() garageActive = false;

  @Output() garageToggle = new EventEmitter<void>();
}
