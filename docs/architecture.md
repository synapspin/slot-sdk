# Architecture Overview

## High-Level Architecture

```mermaid
graph TB
  subgraph "Game Layer (main.ts)"
    GD[GameDefinition.ts]
    RC[config.json]
    DEC[Decorative Elements<br>bg, frame, title, character]
  end

  subgraph "SDK Core (@lab9191/slot-core)"
    GA[GameApp]
    EB[EventBus]
    SM[GameStateMachine]
    RS[ReelSet]
    UI[UIManager]
    SND[SoundManager]
    FR[FeatureRegistry]
    RM[ResponsiveManager]
    TM[Telemetry]
    AL[AssetLoader]
    PL[Preloader]
  end

  subgraph "Server"
    SA[IServerAdapter]
    MOCK[MockServerAdapter]
    REAL[RemoteServerAdapter]
  end

  GD --> GA
  RC -->|fetch /config.json| GA
  GA --> EB
  GA --> SM
  GA --> RS
  GA --> UI
  GA --> SND
  GA --> FR
  GA --> RM
  GA --> TM
  GA --> AL
  GA --> PL
  SA --> MOCK
  SA --> REAL
  GA --> SA
  DEC --> GA
```

## Layer Hierarchy

PixiJS display objects are organized in layers:

```mermaid
graph TB
  Stage[app.stage]
  GC[gameContainer<br>scaled by ResponsiveManager]
  RL[reelLayer]
  FX[fxLayer<br>frame, win effects]
  UIL[uiLayer<br>bottom bar, spin button, modals]
  RST[ReelSet<br>Reel x5, Symbol x15+]

  Stage --> GC
  GC --> RL
  GC --> FX
  GC --> UIL
  RL --> RST
```

**Z-order (back to front):**
1. Background sprite (added to `gameContainer` at index 0)
2. Reel background (dark overlay in `reelLayer`)
3. ReelSet with symbols (`reelLayer`)
4. Reel frame (`fxLayer` — renders OVER symbols)
5. Win lines, coin effects (`fxLayer`)
6. Bottom bar, spin button, modals (`uiLayer`)
7. Decorative elements — title, character (`gameContainer`)

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| **GameApp** | Bootstrap, lifecycle, layer management, layout target |
| **EventBus** | Typed pub/sub for all module communication |
| **GameStateMachine** | FSM controlling game flow (idle → spin → evaluate → win → feature) |
| **ReelSet / Reel / Symbol** | Visual reel engine with animation strategies |
| **UIManager** | All UI components — bottom bar, spin button, menus |
| **SoundManager** | Audio playback via Howler.js |
| **FeatureRegistry** | Plugin installation and FSM state injection |
| **ResponsiveManager** | Resize handling, landscape/portrait switching |
| **Telemetry** | Transparent event logging for debugging |
| **AssetLoader** | PixiJS Assets API wrapper with progress callbacks |
| **Preloader** | HTML-based branded splash screen |

## Data Flow

```mermaid
sequenceDiagram
  participant User
  participant UI as UIManager
  participant EB as EventBus
  participant SM as StateMachine
  participant Server
  participant Reels as ReelSet

  User->>UI: Click Spin
  UI->>EB: ui:spinButtonPressed
  EB->>SM: → SpinRequestState
  SM->>Server: spin(bet, anteBet)
  Server-->>SM: SpinResponse
  SM->>EB: spin:responseReceived
  SM->>Reels: startSpin()
  Note over SM: SpinningState (min spin time)
  SM->>Reels: stopReels(result)
  Reels-->>SM: reels:stopped
  SM->>SM: EvaluateState
  SM->>SM: WinPresentationState
  SM->>SM: FeatureCheckState
  SM->>SM: → IdleState
```

## Key Design Decisions

1. **Server is the single source of truth** — client never computes RNG or payouts
2. **Plugin architecture** — game mechanics are plugins, not hard-coded
3. **Composition over inheritance** — games configure via objects, not subclassing
4. **Event-driven** — all modules communicate through EventBus
5. **External runtime config** — operator can tune game via config.json without rebuilding
6. **HTML preloader** — doesn't touch PixiJS render pipeline
7. **Telemetry by default** — every event logged transparently
