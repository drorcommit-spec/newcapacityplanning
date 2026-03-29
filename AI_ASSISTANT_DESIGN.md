# AI Assistant for Capacity Planning - Design Document

## Overview
Implement a natural language AI assistant that allows users to manage team capacity using conversational commands instead of manual UI interactions.

## User Experience

### Example Commands
```
"Add member Daniel to the next 3 sprints with new project XXX and capacity of 15%"
"Allocate Sarah 50% to Project Alpha for January Sprint 1"
"Show me all overallocated members"
"What's John's capacity for next month?"
"Move Mike from Project Beta to Project Gamma in February"
"Create a new project called 'AI Initiative' for customer Acme Corp"
"Remove all allocations for Project Delta"
"Copy January allocations to February"
"Who is working on Project Alpha?"
"What projects need more resources?"
```

## Architecture

### Components

#### 1. AI Assistant Chat Interface
- **Location**: Floating button in bottom-right corner
- **Design**: Chat bubble interface
- **Features**:
  - Text input for natural language commands
  - Command history
  - Suggestions/autocomplete
  - Voice input (optional)
  - Quick action buttons

#### 2. Natural Language Processor
- **Purpose**: Parse user commands into structured actions
- **Technology Options**:
  - **Option A**: OpenAI GPT API (most powerful, requires API key)
  - **Option B**: Local pattern matching (no external dependencies)
  - **Option C**: Hybrid approach (patterns + AI fallback)

#### 3. Command Executor
- **Purpose**: Execute parsed commands using existing data context
- **Integration**: Uses existing DataContext functions

#### 4. Response Generator
- **Purpose**: Provide natural language feedback
- **Features**:
  - Success confirmations
  - Error explanations
  - Clarification questions
  - Suggestions

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create AI Assistant component
2. Implement chat UI
3. Set up command parser (pattern-based)
4. Connect to DataContext

### Phase 2: Basic Commands
1. Add member to sprint
2. Update allocation percentage
3. Remove allocation
4. Query member capacity
5. Query project allocations

### Phase 3: Advanced Commands
1. Bulk operations (multiple sprints)
2. Create new projects
3. Copy allocations
4. Complex queries
5. Conditional operations

### Phase 4: AI Enhancement
1. Integrate OpenAI API (optional)
2. Context-aware suggestions
3. Learning from user patterns
4. Predictive recommendations

## Command Patterns

### Allocation Commands
```typescript
interface AllocationCommand {
  action: 'add' | 'update' | 'remove';
  member: string;
  project: string;
  sprints: SprintInfo[];
  percentage: number;
  createProject?: boolean;
}
```

**Patterns**:
- "add [member] to [project] in [sprint] with [percentage]%"
- "allocate [member] [percentage]% to [project] for [sprint]"
- "assign [member] to [project] at [percentage]% capacity"

### Query Commands
```typescript
interface QueryCommand {
  action: 'query';
  type: 'member' | 'project' | 'sprint' | 'capacity';
  target: string;
  filters?: any;
}
```

**Patterns**:
- "show [member]'s allocations"
- "what is [member] working on?"
- "who is on [project]?"
- "what's the capacity for [sprint]?"

### Bulk Commands
```typescript
interface BulkCommand {
  action: 'bulk';
  operation: string;
  targets: string[];
  parameters: any;
}
```

**Patterns**:
- "add [member] to next [N] sprints"
- "copy [sprint] allocations to [sprint]"
- "remove all allocations for [project]"

## Technical Implementation

### Pattern Matching Engine
```typescript
interface CommandPattern {
  pattern: RegExp;
  parser: (match: RegExpMatchArray) => Command;
  validator: (command: Command) => boolean;
  executor: (command: Command) => Promise<Result>;
}

const patterns: CommandPattern[] = [
  {
    pattern: /add (?<member>[\w\s]+) to (?<project>[\w\s]+) (?:in|for) (?<sprint>[\w\s]+) (?:with|at) (?<percentage>\d+)%/i,
    parser: (match) => ({
      action: 'add',
      member: match.groups.member,
      project: match.groups.project,
      sprint: parseSprint(match.groups.sprint),
      percentage: parseInt(match.groups.percentage)
    }),
    validator: (cmd) => cmd.percentage > 0 && cmd.percentage <= 100,
    executor: async (cmd) => await addAllocation(cmd)
  }
];
```

### OpenAI Integration (Optional)
```typescript
async function parseWithAI(userInput: string, context: AppContext) {
  const prompt = `
You are a capacity planning assistant. Parse this command into a structured action:
"${userInput}"

Available members: ${context.members.map(m => m.fullName).join(', ')}
Available projects: ${context.projects.map(p => p.projectName).join(', ')}
Current sprint: ${context.currentSprint}

Return JSON with: { action, member, project, sprint, percentage, createProject }
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Command Execution
```typescript
async function executeCommand(command: Command, context: DataContext) {
  try {
    switch (command.action) {
      case 'add':
        return await executeAddAllocation(command, context);
      case 'update':
        return await executeUpdateAllocation(command, context);
      case 'remove':
        return await executeRemoveAllocation(command, context);
      case 'query':
        return await executeQuery(command, context);
      default:
        throw new Error('Unknown command');
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute command: ${error.message}`,
      suggestions: generateSuggestions(command, error)
    };
  }
}
```

## UI Design

### Chat Interface
```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  command?: Command;
  result?: Result;
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button 
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AIIcon />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl">
          <ChatHeader />
          <MessageList messages={messages} />
          <ChatInput 
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </>
  );
};
```

### Quick Actions
```typescript
const QuickActions = () => (
  <div className="flex flex-wrap gap-2 p-4">
    <QuickActionButton 
      label="Add Allocation"
      command="add [member] to [project]"
    />
    <QuickActionButton 
      label="Show Capacity"
      command="show capacity for [member]"
    />
    <QuickActionButton 
      label="Overallocated"
      command="show overallocated members"
    />
  </div>
);
```

## Smart Features

### Context Awareness
- Remember previous commands
- Suggest based on current view
- Auto-complete member/project names
- Understand relative dates ("next month", "this sprint")

### Validation & Confirmation
- Validate commands before execution
- Ask for confirmation on bulk operations
- Suggest corrections for ambiguous commands
- Provide undo functionality

### Learning & Suggestions
- Track frequently used commands
- Suggest common operations
- Learn user preferences
- Provide keyboard shortcuts

## Example Interactions

### Scenario 1: Add New Allocation
```
User: "Add Daniel to Project Alpha for next 3 sprints at 15%"