import { Container, Text } from 'pixi.js';
import { ToggleSwitch } from './components/ToggleSwitch';
import { Modal } from './components/Modal';
import type { EventBus } from '../events/EventBus';

export class SettingsPanel extends Modal {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    super({
      width: 400,
      height: 350,
      title: 'SETTINGS',
      closeButton: true,
    });
    this.eventBus = eventBus;
    this.buildContent();
  }

  private buildContent(): void {
    const content = this.contentContainer;
    let y = 10;

    // Sound toggle
    const soundToggle = new ToggleSwitch({
      label: 'Sound',
      defaultValue: true,
      fontSize: 18,
    });
    soundToggle.y = y;
    soundToggle.onChange((enabled) => {
      this.eventBus.emit('ui:soundToggled', { enabled });
    });
    content.addChild(soundToggle);
    y += 55;

    // Quick Spin toggle
    const quickSpinToggle = new ToggleSwitch({
      label: 'Quick Spin',
      defaultValue: false,
      fontSize: 18,
    });
    quickSpinToggle.y = y;
    quickSpinToggle.onChange((enabled) => {
      this.eventBus.emit('ui:quickSpinToggled', { enabled });
    });
    content.addChild(quickSpinToggle);
    y += 55;

    // Turbo Spin toggle
    const turboSpinToggle = new ToggleSwitch({
      label: 'Turbo Spin',
      defaultValue: false,
      fontSize: 18,
    });
    turboSpinToggle.y = y;
    turboSpinToggle.onChange((enabled) => {
      this.eventBus.emit('ui:turboSpinToggled', { enabled });
    });
    content.addChild(turboSpinToggle);
  }
}
