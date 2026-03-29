import { Container, Graphics, Text } from 'pixi.js';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import type { RoundRecord } from '../replay/RoundRecorder';
import { RoundRecorder } from '../replay/RoundRecorder';
import { formatCurrency } from '../math/Currency';

export class HistoryPanel extends Modal {
  private listContainer: Container;
  private getRounds: () => RoundRecord[];
  private noRoundsText: Text;
  /** Callback to play a round replay in-game */
  onPlayReplay: ((record: RoundRecord) => void) | null = null;

  constructor(getRounds: () => RoundRecord[]) {
    super({
      width: 750,
      height: 520,
      title: 'ROUND HISTORY',
      closeButton: true,
    });
    this.getRounds = getRounds;

    this.listContainer = new Container();
    this.listContainer.y = 10;
    this.contentContainer.addChild(this.listContainer);

    this.noRoundsText = new Text({
      text: 'No rounds played yet. Spin to record rounds!',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 16,
        fill: 0x888888,
      },
    });
    this.noRoundsText.x = 330;
    this.noRoundsText.y = 150;
    this.noRoundsText.anchor.set(0.5, 0);
    this.contentContainer.addChild(this.noRoundsText);
  }

  open(): void {
    this.refresh();
    super.open();
  }

  private refresh(): void {
    this.listContainer.removeChildren();

    const rounds = this.getRounds().slice().reverse(); // newest first
    this.noRoundsText.visible = rounds.length === 0;

    const rowHeight = 56;
    const maxVisible = 7;

    rounds.slice(0, maxVisible).forEach((round, i) => {
      const row = this.createRow(round);
      row.y = i * rowHeight;
      this.listContainer.addChild(row);
    });

    if (rounds.length > maxVisible) {
      const moreText = new Text({
        text: `+ ${rounds.length - maxVisible} more rounds`,
        style: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 13, fill: 0x666666 },
      });
      moreText.y = maxVisible * rowHeight + 5;
      moreText.x = 300;
      this.listContainer.addChild(moreText);
    }
  }

  private createRow(round: RoundRecord): Container {
    const row = new Container();
    const w = 700;
    const h = 50;

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 6);
    bg.fill({ color: 0x1a1a2e, alpha: 0.8 });
    bg.stroke({ width: 1, color: 0x2a2a4a });
    row.addChild(bg);

    // Time
    const time = new Date(round.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeText = new Text({
      text: timeStr,
      style: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 13, fill: 0x888888 },
    });
    timeText.x = 12;
    timeText.y = 17;
    row.addChild(timeText);

    // Bet
    const betText = new Text({
      text: `Bet: ${formatCurrency(round.player.bet, round.player.currency)}`,
      style: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 13, fill: 0xaaaaaa },
    });
    betText.x = 100;
    betText.y = 17;
    row.addChild(betText);

    // Win
    const winAmount = round.outcome.totalWin;
    const winColor = winAmount > 0 ? 0x44ff44 : 0x666666;
    const winText = new Text({
      text: winAmount > 0
        ? `Win: ${formatCurrency(winAmount, round.player.currency)}`
        : 'No win',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 14,
        fill: winColor,
        fontWeight: winAmount > 0 ? 'bold' : 'normal',
      },
    });
    winText.x = 260;
    winText.y = 16;
    row.addChild(winText);

    // Feature / Big win badge
    if (round.outcome.bigWinTier) {
      const badge = new Text({
        text: `${round.outcome.bigWinTier.toUpperCase()} WIN`,
        style: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 11, fill: 0xff6600, fontWeight: 'bold' },
      });
      badge.x = 410;
      badge.y = 18;
      row.addChild(badge);
    } else if (round.outcome.featureTriggered) {
      const badge = new Text({
        text: round.outcome.featureTriggered.toUpperCase(),
        style: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 11, fill: 0xffd700, fontWeight: 'bold' },
      });
      badge.x = 410;
      badge.y = 18;
      row.addChild(badge);
    }

    // PLAY button — replay in-game
    const playBtn = new Button({
      width: 65,
      height: 32,
      label: 'PLAY',
      fontSize: 12,
      bgColor: 0x22aa44,
      bgColorHover: 0x33bb55,
      cornerRadius: 6,
      borderWidth: 0,
    });
    playBtn.x = w - 175;
    playBtn.y = 9;
    playBtn.onClick(() => {
      this.close();
      this.onPlayReplay?.(round);
    });
    row.addChild(playBtn);

    // SHARE button — copy replay URL
    const shareBtn = new Button({
      width: 70,
      height: 32,
      label: 'SHARE',
      fontSize: 12,
      bgColor: 0x2a4a6a,
      bgColorHover: 0x3a5a8a,
      cornerRadius: 6,
      borderWidth: 0,
    });
    shareBtn.x = w - 95;
    shareBtn.y = 9;
    shareBtn.onClick(() => {
      const url = RoundRecorder.createReplayUrl(round, window.location.origin + window.location.pathname);
      navigator.clipboard?.writeText(url).then(() => {
        shareBtn.setLabel('COPIED!');
        setTimeout(() => shareBtn.setLabel('SHARE'), 1500);
      }).catch(() => {
        // Fallback: open in new tab
        window.open(url, '_blank');
      });
    });
    row.addChild(shareBtn);

    return row;
  }
}
