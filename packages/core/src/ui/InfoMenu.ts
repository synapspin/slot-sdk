import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import type { InfoPageConfig } from '../app/GameConfig';

export class InfoMenu extends Modal {
  private pages: InfoPageConfig[];
  private currentPage = 0;
  private pageContainer: Container;
  private prevBtn: Button;
  private nextBtn: Button;
  private pageIndicator: Text;

  constructor(pages: InfoPageConfig[] = []) {
    super({
      width: 800,
      height: 600,
      title: 'GAME INFO',
      closeButton: true,
    });
    this.pages = pages;

    this.pageContainer = new Container();
    this.contentContainer.addChild(this.pageContainer);

    // Navigation
    const navY = 500;

    this.prevBtn = new Button({
      width: 80,
      height: 40,
      label: '< Prev',
      fontSize: 14,
      bgColor: 0x2a2a4a,
      cornerRadius: 6,
      borderWidth: 0,
    });
    this.prevBtn.y = navY;
    this.prevBtn.onClick(() => this.navigate(-1));
    this.contentContainer.addChild(this.prevBtn);

    this.pageIndicator = new Text({
      text: '1 / 1',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 16,
        fill: 0xaaaaaa,
      },
    });
    this.pageIndicator.anchor.set(0.5);
    this.pageIndicator.x = 370;
    this.pageIndicator.y = navY + 20;
    this.contentContainer.addChild(this.pageIndicator);

    this.nextBtn = new Button({
      width: 80,
      height: 40,
      label: 'Next >',
      fontSize: 14,
      bgColor: 0x2a2a4a,
      cornerRadius: 6,
      borderWidth: 0,
    });
    this.nextBtn.x = 680;
    this.nextBtn.y = navY;
    this.nextBtn.onClick(() => this.navigate(1));
    this.contentContainer.addChild(this.nextBtn);

    this.showPage(0);
  }

  setPages(pages: InfoPageConfig[]): void {
    this.pages = pages;
    this.showPage(0);
  }

  private navigate(direction: number): void {
    const newPage = this.currentPage + direction;
    if (newPage >= 0 && newPage < this.pages.length) {
      this.showPage(newPage);
    }
  }

  private showPage(index: number): void {
    this.currentPage = index;
    this.pageContainer.removeChildren();

    if (this.pages.length === 0) {
      const noContent = new Text({
        text: 'No game info available.',
        style: {
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: 18,
          fill: 0x888888,
        },
      });
      noContent.x = 300;
      noContent.y = 200;
      noContent.anchor.set(0.5);
      this.pageContainer.addChild(noContent);
      return;
    }

    const page = this.pages[index];

    // Page title
    const title = new Text({
      text: page.title,
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 22,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    title.x = 0;
    title.y = 0;
    this.pageContainer.addChild(title);

    if (page.type === 'image') {
      const texture = Assets.get(page.content);
      if (texture) {
        const sprite = new Sprite(texture);
        sprite.y = 40;
        sprite.width = 740;
        sprite.height = 420;
        this.pageContainer.addChild(sprite);
      }
    } else {
      const text = new Text({
        text: page.content,
        style: {
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: 15,
          fill: 0xcccccc,
          wordWrap: true,
          wordWrapWidth: 740,
          lineHeight: 22,
        },
      });
      text.y = 40;
      this.pageContainer.addChild(text);
    }

    // Update nav
    this.pageIndicator.text = `${index + 1} / ${this.pages.length}`;
    this.prevBtn.enabled = index > 0;
    this.nextBtn.enabled = index < this.pages.length - 1;
    this.setTitle(page.title);
  }
}
