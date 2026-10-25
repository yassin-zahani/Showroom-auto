import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutoFilters, DEFAULT_FILTERS } from '../../interfaces/auto-filters';
import { SearchBar } from './search-bar';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SearchBar', () => {
  let component: SearchBar;
  let fixture: ComponentFixture<SearchBar>;
  let emitted: AutoFilters[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SearchBar] }).compileComponents();
    fixture = TestBed.createComponent(SearchBar);
    component = fixture.componentInstance;
    emitted = [];
    component.filtersChange.subscribe((f) => emitted.push(f));
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not emit on start', async () => {
    await wait(300);
    expect(emitted).toEqual([]);
  });

  it('emits ONE complete filters object after the user stops typing (debounce)', async () => {
    component.form.controls.query.setValue('a');
    component.form.controls.query.setValue('au');
    component.form.controls.query.setValue('audi');
    await wait(300);

    expect(emitted).toEqual([{ ...DEFAULT_FILTERS, query: 'audi' }]);
  });

  it('shows Reset only when something is filtered, and Reset restores the defaults', async () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.reset')).toBeNull();

    component.form.controls.maxPrice.setValue(300);
    await fixture.whenStable();
    expect(root.querySelector('.reset')).not.toBeNull();

    component.reset();
    await wait(300);
    expect(component.form.getRawValue()).toEqual(DEFAULT_FILTERS);
    expect(emitted.at(-1)).toEqual(DEFAULT_FILTERS);
  });

  it('displays the counts given by its parent', async () => {
    fixture.componentRef.setInput('resultCount', 5);
    fixture.componentRef.setInput('totalCount', 16);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.count')?.textContent).toMatch(/5\s+of 16/);
  });
});
