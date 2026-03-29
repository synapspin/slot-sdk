import { Container, Graphics, Text } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { EventBus } from '../events/EventBus';
import type { StateMachine } from '../state/StateMachine';

export class DevTools extends Container {
  private fpsText: Text;
  private stateText: Text;
  private bg: Graphics;
  private app: Application;
  private eventBus: EventBus;
  private stateMachine: StateMachine;

  constructor(app: Application, eventBus: EventBus, stateMachine: StateMachine) {
    super();
    this.app = app;
    this.eventBus = eventBus;
    this.stateMachine = stateMachine;

    // Background
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, 200, 60, 4);
    this.bg.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(this.bg);

    // FPS
    this.fpsText = new Text({
      text: 'FPS: --',
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x44ff44,
      },
    });
    this.fpsText.x = 8;
    this.fpsText.y = 5;
    this.addChild(this.fpsText);

    // State
    this.stateText = new Text({
      text: 'State: --',
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x44aaff,
      },
    });
    this.stateText.x = 8;
    this.stateText.y = 22;
    this.addChild(this.stateText);

    // Position in top-right corner
    this.x = 10;
    this.y = 10;

    // Update on tick
    app.ticker.add(() => {
      this.fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;
      this.stateText.text = `State: ${stateMachine.currentStateId ?? 'none'}`;
    });

    // Log events
    eventBus.on('state:changed', ({ from, to }) => {
      console.log(`[DevTools] State: ${from} → ${to}`);
    });
  }
}
