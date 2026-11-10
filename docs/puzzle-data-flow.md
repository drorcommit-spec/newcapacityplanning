# Puzzle View — Data Flow (High Level)

A lean overview of how data flows through the Puzzle view (`ProjectMatrixView`).

```mermaid
flowchart TD
    subgraph Backend
        DB[(database.json)]
        SRV[Node/Express server<br/>:3002]
        DB <--> SRV
    end

    subgraph API["services/api"]
        FETCH[fetchAllData]
        SAVE[saveAllocations /<br/>saveProjects / saveTeamMembers]
        DEL[deleteAllocationById]
    end

    subgraph Store["DataContext (global state)"]
        STATE[projects, allocations,<br/>teamMembers, history]
        CRUD[addAllocation /<br/>updateAllocation /<br/>deleteAllocation]
    end

    subgraph Puzzle["Puzzle View (ProjectMatrixView)"]
        FILTERS[Filters + period offset +<br/>sprint length<br/>localStorage-synced]
        WEEKS[weekUtils:<br/>firstWeekOfCurrentSprint →<br/>visible weeks → groupWeeksIntoSprints]
        GRID[Sprint x Member matrix cells]
        EDITOR[WeekSpanEditor<br/>edit / add / delete + scope]
    end

    USER((User))

    SRV --> FETCH --> STATE
    STATE --> WEEKS
    FILTERS --> WEEKS
    WEEKS --> GRID --> Puzzle
    STATE --> GRID

    USER -->|click cell| EDITOR
    EDITOR -->|save/clear + scope| CRUD
    CRUD -->|optimistic update| STATE
    CRUD -->|persist| SAVE
    CRUD -->|remove| DEL
    SAVE --> SRV
    DEL --> SRV
    STATE -->|re-render| GRID
```

## Read path
1. The Node server loads `database.json`.
2. `fetchAllData` populates DataContext state (projects, allocations, team members, history).
3. The Puzzle view combines that state with its filters (period offset, sprint length, manager/member selections — synced via `localStorage`).
4. `weekUtils` computes the visible weeks (anchored to the current sprint via `firstWeekOfCurrentSprint`) and groups them into sprints (`groupWeeksIntoSprints`).
5. The sprint × member matrix renders.

## Write path
1. A cell click opens `WeekSpanEditor`.
2. On save/clear (with the chosen scope: this sprint only vs this + future), it calls `addAllocation` / `updateAllocation` / `deleteAllocation`.
3. DataContext updates state optimistically (via refs, so multi-week loops don't race) and persists through `services/api` to the Node server, which writes `database.json`.
4. State changes re-render the grid immediately.
