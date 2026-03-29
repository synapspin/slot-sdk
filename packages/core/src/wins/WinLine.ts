import { Container, Graphics, Text } from 'pixi.js';
import type { ReelSet } from '../reels/ReelSet';

export class WinLine extends Container {
  private line: Graphics;
  private payoutLabel: Text;

  constructor() {
    super();
    this.line = new Graphics();
    this.addChild(this.line);

    this.payoutLabel = new Text({
      text: '',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 22,
        fontWeight: 'bold',
        fill: 0xffffff,
        dropShadow: {
          color: 0x000000,
          blur: 6,
          distance: 2,
          angle: Math.PI / 4,
        },
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.payoutLabel.anchor.set(0.5);
    this.payoutLabel.visible = false;
    this.addChild(this.payoutLabel);
  }

  /** Draw a highlight line through winning positions with payout display */
  draw(
    positions: [number, number][],
    reelSet: ReelSet,
    color: number = 0xffd700,
    lineWidth: number = 5,
    payout?: number,
  ): void {
    this.line.clear();
    this.payoutLabel.visible = false;

    if (positions.length === 0) return;

    const points: { x: number; y: number }[] = [];
    for (const [col, row] of positions) {
      const reel = reelSet.getReel(col);
      const sym = reel?.getSymbolAt(row);
      if (reel && sym) {
        points.push({
          x: reelSet.x + reel.x + sym.x,
          y: reelSet.y + reel.y + sym.y,
        });
      }
    }

    if (points.length === 0) return;

    // Sort by x
    points.sort((a, b) => a.x - b.x);

    // Draw glow line (thicker, transparent)
    this.line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.line.lineTo(points[i].x, points[i].y);
    }
    this.line.stroke({ width: lineWidth + 6, color, alpha: 0.25 });

    // Draw main line
    this.line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.line.lineTo(points[i].x, points[i].y);
    }
    this.line.stroke({ width: lineWidth, color, alpha: 0.9 });

    // Draw circles at each position
    for (const p of points) {
      // Glow
      this.line.circle(p.x, p.y, 14);
      this.line.fill({ color, alpha: 0.3 });
      // Inner dot
      this.line.circle(p.x, p.y, 8);
      this.line.fill({ color, alpha: 0.7 });
    }

    // Show payout label at the center/end of the line
    if (payout !== undefined && payout > 0) {
      const lastPoint = points[points.length - 1];
      const centerPoint = points[Math.floor(points.length / 2)];

      this.payoutLabel.text = `+${(payout / 100).toFixed(2)}`;
      this.payoutLabel.style.fill = color;
      // Position above the center of the win line
      this.payoutLabel.x = centerPoint.x;
      this.payoutLabel.y = centerPoint.y - 30;
      this.payoutLabel.visible = true;
    }
  }

  clear(): void {
    this.line.clear();
    this.payoutLabel.visible = false;
  }
}
