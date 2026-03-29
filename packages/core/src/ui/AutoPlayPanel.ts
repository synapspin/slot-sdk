import { Container, Graphics, Text } from 'pixi.js';
import { Button } from './components/Button';
import { ToggleSwitch } from './components/ToggleSwitch';
import { Modal } from './components/Modal';
import type { EventBus } from '../events/EventBus';

export class AutoPlayPanel extends Modal {
  private eventBus: EventBus;
  private presets: number[];
  private stopOnFeature: ToggleSwitch;

  constructor(eventBus: EventBus, presets: number[] = [10, 25, 50, 100, 250, 500]) {
    super({
      width: 400,
      height: 450,
      title: 'AUTO PLAY',
      closeButton: true,
    });
    this.eventBus = eventBus;
    this.presets = presets;

    this.buildContent();

    this.stopOnFeature = new ToggleSwitch({
      label: 'Stop on Feature',
      defaultValue: true,
    });
  }

  private buildContent(): void {
    const content = this.contentContainer;
    let y = 10;

    // Spin count presets
    const titleText = new Text({
      text: 'Number of Spins',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 16,
        fill: 0xaaaaaa,
      },
    });
    titleText.y = y;
    content.addChild(titleText);
    y += 35;

    const cols = 3;
    const btnW = 100;
    const btnH = 50;
    const gap = 12;

    this.presets.forEach((count, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const btn = new Button({
        width: btnW,
        height: btnH,
        label: count.toString(),
        fontSize: 18,
        bgColor: 0x2a2a4a,
        bgColorHover: 0x3a3a5a,
        cornerRadius: 8,
        borderWidth: 0,
      });
      btn.x = col * (btnW + gap);
      btn.y = y + row * (btnH + gap);
      btn.onClick(() => this.startAutoPlay(count));
      content.addChild(btn);
    });

    y += Math.ceil(this.presets.length / cols) * (btnH + gap) + 20;

    // Stop on Feature toggle
    this.stopOnFeature = new ToggleSwitch({
      label: 'Stop on Feature',
      defaultValue: true,
    });
    this.stopOnFeature.y = y;
    content.addChild(this.stopOnFeature);
  }

  private startAutoPlay(spins: number): void {
    this.eventBus.emit('ui:autoPlayStarted', {
      spins,
      stopOnFeature: this.stopOnFeature.value,
    });
    this.close();
  }
}
