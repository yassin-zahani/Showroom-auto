import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auto } from '../../interfaces/auto';
import { MarketStats } from '../../interfaces/market';
import { MarketPrice } from './market-price';

const car = (id: number, model: string): Auto => ({
  id, brand: 'Audi', model, price: 350, power: 16, photo: '', availability: 1, description: '',
});

const stats = (over: Partial<MarketStats> = {}): MarketStats => ({
  source: 'demo data', sourceUrl: 'https://www.automobile.tn/', mode: 'mock', currency: 'TND', comparable: true,
  note: null, brand: 'Audi', model: 'Q5', minYear: 2024, count: 6, min: 250000, median: 280000, max: 300000,
  fetchedAt: '2026-10-24T10:00:00Z', cached: false, ...over,
});

describe('MarketPrice', () => {
  let fixture: ComponentFixture<MarketPrice>;
  let http: HttpTestingController;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketPrice],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MarketPrice);
    root = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  it('shows a skeleton, then the median and the gap with the showroom price', async () => {
    fixture.componentRef.setInput('car', car(1, 'Q5'));
    await fixture.whenStable();
    expect(root.querySelector('.skeleton')).not.toBeNull();

    http.expectOne((r) => r.url === '/api/market' && r.params.get('model') === 'Q5').flush(stats());
    await fixture.whenStable();

    const text = (root.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Market median');
    expect(text).toContain('+25 %'); // 350 000 vs 280 000
    expect(text).toContain('Demo data');
  });

  it('cancels the pending request when another car is selected (switchMap)', async () => {
    fixture.componentRef.setInput('car', car(1, 'Q5'));
    await fixture.whenStable();
    const first = http.expectOne((r) => r.params.get('model') === 'Q5');

    fixture.componentRef.setInput('car', car(2, 'Q3'));
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    http.expectOne((r) => r.params.get('model') === 'Q3').flush(stats({ model: 'Q3' }));
  });

  it('turns an HTTP failure into an error state, and retries on demand', async () => {
    fixture.componentRef.setInput('car', car(1, 'Q5'));
    await fixture.whenStable();
    http.expectOne('/api/market?brand=Audi&model=Q5').flush('x', { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();
    expect(root.textContent).toContain('not reachable');

    (root.querySelector('.retry') as HTMLButtonElement).click();
    await fixture.whenStable();
    http.expectOne('/api/market?brand=Audi&model=Q5').flush(stats());
    await fixture.whenStable();
    expect(root.textContent).toContain('Market median');
  });

  it('shows figures in their own currency, WITHOUT comparing them to the showroom price', async () => {
    fixture.componentRef.setInput('car', car(1, 'Q5'));
    await fixture.whenStable();
    http.expectOne('/api/market?brand=Audi&model=Q5').flush(
      stats({ mode: 'live', currency: 'GBP', comparable: false, minYear: null, min: 47.8, median: 50.94, max: 53.74, note: 'Practice site' }),
    );
    await fixture.whenStable();

    const text = (root.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Median price');
    expect(text).toContain('Practice site');
    expect(text).not.toContain('vs the market median');
    expect(text).not.toContain('Showroom (new)');
  });

  it('explains when no comparable listing exists', async () => {
    fixture.componentRef.setInput('car', car(1, 'Q5'));
    await fixture.whenStable();
    http.expectOne('/api/market?brand=Audi&model=Q5').flush(stats({ count: 0, median: undefined }));
    await fixture.whenStable();
    expect(root.textContent).toContain('No comparable listings');
  });
});
