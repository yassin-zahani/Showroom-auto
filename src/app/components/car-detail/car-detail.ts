import { CurrencyPipe, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendarCheck, faGaugeHigh, faHeart, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Auto } from '../../interfaces/auto';
import { MarketPrice } from '../market-price/market-price';
import { TestDriveForm } from '../test-drive-form/test-drive-form';


@Component({
  imports: [CurrencyPipe, FontAwesomeModule, MarketPrice, TestDriveForm],
  selector: 'app-car-detail',
  styleUrl: './car-detail.css',
  templateUrl: './car-detail.html',
})
export class CarDetail implements OnInit, AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private previousOverflow = '';
  private previouslyFocused: Element | null = null;

  readonly faHeart = faHeart;
  readonly faXmark = faXmark;
  readonly faGaugeHigh = faGaugeHigh;
  readonly faCalendarCheck = faCalendarCheck;

  @Input({ required: true }) car!: Auto;
  @Input() isFavorite = false;

  @Output() closed = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<Auto>();

  showForm = false;

  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.previouslyFocused = this.document.activeElement;
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.dialog.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    if (this.previouslyFocused instanceof HTMLElement) {
      this.previouslyFocused.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
