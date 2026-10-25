import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('should create the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('shows the whole catalogue as soon as the page opens', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('My Showroom');
    expect(root.querySelectorAll('app-car-card').length).toBe(16);
  });

  it('opens the details when a card button is clicked, and closes them with the close button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-car-detail')).toBeNull();

    // On passe par un vrai clic : c'est un événement du template, donc Angular (zoneless) en est averti.
    // (Appeler openDetails() à la main ne rafraîchirait pas la vue : aucun signal, aucune zone.)
    (root.querySelector('app-car-card .more') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('app-car-detail')).not.toBeNull();

    (root.querySelector('app-car-detail .close') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('app-car-detail')).toBeNull();
  });

  it('adds a car to the garage from its heart and counts it in the header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelector('app-car-card .fav') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root.querySelector('.badge')?.textContent).toContain('1');
    expect(root.querySelector('app-car-card .fav')?.classList.contains('on')).toBe(true);
  });
});
