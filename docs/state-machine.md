# State Machine

The game flow is driven by a finite state machine (FSM). The core SDK provides default states; feature plugins inject additional states and transitions.

## Core States

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> SpinRequest: Spin button / Space / AutoPlay
  SpinRequest --> Spinning: Server responds
  SpinRequest --> Idle: Error / insufficient balance
  Spinning --> Evaluate: Reels stopped
  Evaluate --> WinPresentation: Has wins
  Evaluate --> FeatureCheck: No wins
  WinPresentation --> FeatureCheck: Presentation done / skipped
  FeatureCheck --> Idle: No feature
  FeatureCheck --> FreeSpins_Intro: freeSpins feature
  FeatureCheck --> HoldAndWin_Intro: holdAndWin feature
```

## State Descriptions

### IdleState
- Enables UI interaction (bet selector, menu, autoplay)
- Listens for `ui:spinButtonPressed` and `ui:autoPlayStarted`
- Checks auto play continuation and stop conditions
- Resets win display

### SpinRequestState
- Locks UI controls
- Validates balance >= bet amount
- Sends `SpinRequest` to server via `IServerAdapter.spin()`
- Stores `SpinResponse` in `context.lastResponse`
- Updates balance from server response

### SpinningState
- Starts reel spin animation
- Waits minimum spin time (600ms normal, 300ms quick spin)
- Listens for stop button → quick stop
- Calls `reelSet.stopReels(result)` with server's reel result

### EvaluateState
- Checks `lastResponse.wins` and `totalWin`
- Routes to `WinPresentation` if wins exist, otherwise `FeatureCheck`

### WinPresentationState
- Shows Big Win celebration (GSAP + coin fountain) if threshold met
- Presents individual win lines with payout amounts
- Dims non-winning symbols
- Skip via click/tap/Space/Enter
- Count-up animation for total win

### FeatureCheckState
- Checks `lastResponse.feature` for triggered bonus
- Transitions to plugin-provided state (e.g. `freeSpins:intro`)
- Falls back to `Idle` if no feature

## Free Spins Sub-States

```mermaid
stateDiagram-v2
  FeatureCheck --> freeSpins_intro: feature.type = freeSpins
  freeSpins_intro --> freeSpins_spin: After intro delay
  freeSpins_spin --> freeSpins_eval: Reels stopped
  freeSpins_eval --> freeSpins_spin: Remaining > 0
  freeSpins_eval --> freeSpins_summary: Remaining = 0
  freeSpins_summary --> Idle: After summary
```

## Hold & Win Sub-States

```mermaid
stateDiagram-v2
  FeatureCheck --> holdAndWin_intro: feature.type = holdAndWin
  holdAndWin_intro --> holdAndWin_respin: After intro
  holdAndWin_respin --> holdAndWin_eval: Reels stopped
  holdAndWin_eval --> holdAndWin_respin: New sticky / respins > 0
  holdAndWin_eval --> holdAndWin_summary: Respins = 0
  holdAndWin_summary --> Idle: After summary
```

## Adding Custom States via Plugins

Plugins implement `IFeaturePlugin.getStates()` and `getTransitions()`:

```typescript
getStates(): Map<string, IState> {
  const states = new Map<string, IState>();
  states.set('myFeature:intro', new MyIntroState());
  states.set('myFeature:play', new MyPlayState());
  states.set('myFeature:summary', new MySummaryState());
  return states;
}
```

The `FeatureCheckState` automatically transitions to `{featureType}:intro` when a feature is triggered. The plugin's summary state should transition back to `idle`.
