import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeadBar } from './head-bar';

describe('HeadBar', () => {
  let fixture: ComponentFixture<HeadBar>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HeadBar] }).compileComponents();
    fixture = TestBed.createComponent(HeadBar);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('renders the title', () => {
    expect(root.querySelector('h1')?.textContent).toContain('My Showroom');
  });

  it('shows the favourites count it receives from its parent', async () => {
    fixture.componentRef.setInput('favoritesCount', 4);
    await fixture.whenStable();
    expect(root.querySelector('.badge')?.textContent).toContain('4');
  });

  it('tells its parent when the garage button is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.garageToggle.subscribe(() => (emitted += 1));
    (root.querySelector('.garage') as HTMLButtonElement).click();
    expect(emitted).toBe(1);
  });
});
