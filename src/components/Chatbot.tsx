import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  actions?: Array<{ label: string; onClick: () => void }>;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { teamMembers, projects, allocations } = useData();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage(
        "👋 Hi! I'm your Puzzle AI Assistant. I can help you with capacity planning, find team members, check project status, and more.\n\nType 'help' to see what I can do, or just ask me a question!"
      );
    }
  }, [isOpen]);

  const addBotMessage = (text: string, actions?: Array<{ label: string; onClick: () => void }>) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      timestamp: new Date(),
      actions,
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const processQuery = (query: string) => {
    const q = query.toLowerCase().trim();

    // Help & Guide
    if (q === 'help' || q === 'what can you do' || q === 'what can you do?') {
      addBotMessage(
        "I can help you with:\n\n" +
        "📊 Navigation: 'show dashboard', 'show capacity planning'\n" +
        "👥 People: 'who is over capacity?', 'find [name]'\n" +
        "📁 Projects: 'show my projects', 'which projects are missing resources?'\n" +
        "📈 Stats: 'what's our average utilization?'\n" +
        "🔍 Search: 'find available Product Managers'\n" +
        "➕ Actions: 'create new project', 'add team member'\n\n" +
        "Try asking me something!",
        [{ label: 'View Full Guide', onClick: () => setShowGuide(true) }]
      );
      return;
    }

    // Navigation
    if (q.includes('dashboard') || q.includes('show dashboard')) {
      addBotMessage('Opening Dashboard...', [
        { label: 'Go to Dashboard →', onClick: () => { navigate('/'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('capacity planning') || q.includes('show capacity')) {
      addBotMessage('Opening Capacity Planning...', [
        { label: 'Go to Capacity Planning →', onClick: () => { navigate('/capacity-planning'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('my projects') || q.includes('my managed')) {
      addBotMessage('Opening your managed projects...', [
        { label: 'View My Projects →', onClick: () => { navigate('/capacity-planning?view=projects'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('team members') || q.includes('view team')) {
      addBotMessage('Opening Team Management...', [
        { label: 'Go to Team →', onClick: () => { navigate('/team'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('project list') || q.includes('all projects')) {
      addBotMessage('Opening Project Management...', [
        { label: 'View All Projects →', onClick: () => { navigate('/projects'); setIsOpen(false); } }
      ]);
      return;
    }

    // Capacity Queries
    if (q.includes('over capacity') || q.includes('overallocated')) {
      const overCapacity = getOverCapacityMembers();
      if (overCapacity.length === 0) {
        addBotMessage('✅ Great news! No team members are over capacity right now.');
      } else {
        const list = overCapacity.map(m => `• ${m.name}: ${m.total}% (${m.role})`).join('\n');
        addBotMessage(
          `Found ${overCapacity.length} member(s) over capacity:\n\n${list}`,
          [{ label: 'View in Capacity Planning →', onClick: () => { navigate('/capacity-planning?view=team&filter=over'); setIsOpen(false); } }]
        );
      }
      return;
    }

    if (q.includes('under capacity') || q.includes('underutilized')) {
      const underCapacity = getUnderCapacityMembers();
      if (underCapacity.length === 0) {
        addBotMessage('All team members are well utilized!');
      } else {
        const list = underCapacity.slice(0, 10).map(m => `• ${m.name}: ${m.total}% (${m.role})`).join('\n');
        addBotMessage(
          `Found ${underCapacity.length} member(s) under capacity:\n\n${list}${underCapacity.length > 10 ? '\n\n...and more' : ''}`,
          [{ label: 'View in Capacity Planning →', onClick: () => { navigate('/capacity-planning?view=team&filter=under'); setIsOpen(false); } }]
        );
      }
      return;
    }

    if (q.includes('available') && !q.includes('find')) {
      const available = getAvailableMembers();
      if (available.length === 0) {
        addBotMessage('No team members are currently available (<70% allocated).');
      } else {
        const list = available.slice(0, 10).map(m => `• ${m.name}: ${m.total}% (${m.role})`).join('\n');
        addBotMessage(
          `Found ${available.length} available member(s):\n\n${list}${available.length > 10 ? '\n\n...and more' : ''}`,
          [{ label: 'View in Capacity Planning →', onClick: () => { navigate('/capacity-planning?view=team&filter=under'); setIsOpen(false); } }]
        );
      }
      return;
    }

    if (q.includes('unallocated')) {
      const unallocated = getUnallocatedMembers();
      if (unallocated.length === 0) {
        addBotMessage('All team members have allocations.');
      } else {
        const list = unallocated.map(m => `• ${m.name} (${m.role})`).join('\n');
        addBotMessage(
          `Found ${unallocated.length} unallocated member(s):\n\n${list}`,
          [{ label: 'View in Capacity Planning →', onClick: () => { navigate('/capacity-planning?view=team&kpi=unallocated'); setIsOpen(false); } }]
        );
      }
      return;
    }

    // Project Queries
    if (q.includes('missing resources') || q.includes('missing allocations')) {
      addBotMessage('Showing projects missing resources...', [
        { label: 'View Projects →', onClick: () => { navigate('/capacity-planning?view=projects&kpi=missing-resources'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('pending projects')) {
      const pending = projects.filter(p => p.status === 'Pending' && !p.isArchived);
      addBotMessage(
        `Found ${pending.length} pending project(s).`,
        [{ label: 'View Pending Projects →', onClick: () => { navigate('/capacity-planning?view=projects&kpi=pending'); setIsOpen(false); } }]
      );
      return;
    }

    if (q.includes('active projects')) {
      const active = projects.filter(p => p.status === 'Active' && !p.isArchived);
      addBotMessage(
        `Found ${active.length} active project(s).`,
        [{ label: 'View Active Projects →', onClick: () => { navigate('/projects?status=Active'); setIsOpen(false); } }]
      );
      return;
    }

    // Statistics
    if (q.includes('average utilization') || q.includes('avg utilization')) {
      const stats = getUtilizationStats();
      addBotMessage(
        `Current Sprint Statistics:\n\n` +
        `• Average Utilization: ${stats.avgUtilization}%\n` +
        `• Members Over Capacity: ${stats.overCapacity}\n` +
        `• Members Under Capacity: ${stats.underCapacity}\n` +
        `• Members at Good Capacity: ${stats.goodCapacity}`,
        [{ label: 'View Dashboard →', onClick: () => { navigate('/'); setIsOpen(false); } }]
      );
      return;
    }

    if (q.includes('how many active projects') || q.includes('active project count')) {
      const count = projects.filter(p => p.status === 'Active' && !p.isArchived).length;
      addBotMessage(`There are ${count} active projects.`, [
        { label: 'View Projects →', onClick: () => { navigate('/projects'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('how many team members') || q.includes('team size')) {
      const count = teamMembers.filter(m => m.isActive).length;
      addBotMessage(`There are ${count} active team members.`, [
        { label: 'View Team →', onClick: () => { navigate('/team'); setIsOpen(false); } }]
      );
      return;
    }

    // Find specific person
    if (q.startsWith('find ') || q.startsWith('show ')) {
      const name = q.replace(/^(find|show)\s+/, '').trim();
      const member = findMemberByName(name);
      if (member) {
        const memberAllocs = getMemberAllocations(member.id);
        const total = memberAllocs.reduce((sum, a) => sum + a.percentage, 0);
        const projectList = memberAllocs.length > 0
          ? memberAllocs.map(a => `• ${a.projectName}: ${a.percentage}%`).join('\n')
          : '• No current allocations';
        
        addBotMessage(
          `${member.fullName} - ${member.role}\n` +
          `Current Allocation: ${total}%\n\n` +
          `Projects:\n${projectList}`,
          [{ label: 'View in Capacity Planning →', onClick: () => { navigate('/capacity-planning?view=team'); setIsOpen(false); } }]
        );
      } else {
        addBotMessage(`I couldn't find a team member named "${name}". Try checking the spelling or use their full name.`);
      }
      return;
    }

    // Find available by role
    if (q.includes('find available') || q.includes('available ')) {
      const roleMatch = q.match(/available\s+(.+)/);
      if (roleMatch) {
        const role = roleMatch[1].trim();
        const available = getAvailableMembersByRole(role);
        if (available.length === 0) {
          addBotMessage(`No available ${role}s found (<70% allocated).`);
        } else {
          const list = available.map(m => `• ${m.name}: ${m.total}% allocated`).join('\n');
          addBotMessage(
            `Found ${available.length} available ${role}(s):\n\n${list}`,
            [{ label: 'Allocate Resources →', onClick: () => { navigate('/capacity-planning'); setIsOpen(false); } }]
          );
        }
        return;
      }
    }

    // Quick Actions
    if (q.includes('create project') || q.includes('new project')) {
      addBotMessage('Opening project creation form...', [
        { label: 'Create Project →', onClick: () => { navigate('/projects?addNew=true'); setIsOpen(false); } }
      ]);
      return;
    }

    if (q.includes('add team member') || q.includes('new member')) {
      addBotMessage('Opening team member form...', [
        { label: 'Add Member →', onClick: () => { navigate('/team'); setIsOpen(false); } }
      ]);
      return;
    }

    // Default response
    addBotMessage(
      "I'm not sure I understand that question. Try:\n\n" +
      "• 'who is over capacity?'\n" +
      "• 'find [member name]'\n" +
      "• 'show my projects'\n" +
      "• 'what's our average utilization?'\n\n" +
      "Type 'help' to see all my capabilities.",
      [{ label: 'View Full Guide', onClick: () => setShowGuide(true) }]
    );
  };

  // Helper functions
  const getCurrentSprint = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      sprint: now.getDate() <= 15 ? 1 : 2,
    };
  };

  const getOverCapacityMembers = () => {
    const sprint = getCurrentSprint();
    const members = teamMembers.filter(m => m.isActive).map(member => {
      const allocs = allocations.filter(
        a => a.productManagerId === member.id &&
             a.year === sprint.year &&
             a.month === sprint.month &&
             a.sprint === sprint.sprint
      );
      const total = allocs.reduce((sum, a) => sum + a.allocationPercentage, 0);
      const capacity = member.capacity ?? 100;
      return { name: member.fullName, role: member.role, total, capacity };
    });
    return members.filter(m => m.total > m.capacity);
  };

  const getUnderCapacityMembers = () => {
    const sprint = getCurrentSprint();
    const members = teamMembers.filter(m => m.isActive).map(member => {
      const allocs = allocations.filter(
        a => a.productManagerId === member.id &&
             a.year === sprint.year &&
             a.month === sprint.month &&
             a.sprint === sprint.sprint
      );
      const total = allocs.reduce((sum, a) => sum + a.allocationPercentage, 0);
      const capacity = member.capacity ?? 100;
      const threshold = capacity * 0.7;
      return { name: member.fullName, role: member.role, total, threshold };
    });
    return members.filter(m => m.total < m.threshold);
  };

  const getAvailableMembers = () => {
    return getUnderCapacityMembers();
  };

  const getUnallocatedMembers = () => {
    const sprint = getCurrentSprint();
    return teamMembers.filter(m => m.isActive).filter(member => {
      const allocs = allocations.filter(
        a => a.productManagerId === member.id &&
             a.year === sprint.year &&
             a.month === sprint.month &&
             a.sprint === sprint.sprint
      );
      return allocs.length === 0;
    }).map(m => ({ name: m.fullName, role: m.role }));
  };

  const getUtilizationStats = () => {
    const sprint = getCurrentSprint();
    const activeMembers = teamMembers.filter(m => m.isActive);
    let totalUtil = 0;
    let overCount = 0;
    let underCount = 0;
    let goodCount = 0;

    activeMembers.forEach(member => {
      const allocs = allocations.filter(
        a => a.productManagerId === member.id &&
             a.year === sprint.year &&
             a.month === sprint.month &&
             a.sprint === sprint.sprint
      );
      const total = allocs.reduce((sum, a) => sum + a.allocationPercentage, 0);
      totalUtil += total;
      
      const capacity = member.capacity ?? 100;
      const underThreshold = capacity * 0.7;
      
      if (total > capacity) overCount++;
      else if (total < underThreshold) underCount++;
      else goodCount++;
    });

    return {
      avgUtilization: activeMembers.length > 0 ? Math.round(totalUtil / activeMembers.length) : 0,
      overCapacity: overCount,
      underCapacity: underCount,
      goodCapacity: goodCount,
    };
  };

  const findMemberByName = (name: string) => {
    const lowerName = name.toLowerCase();
    return teamMembers.find(m => 
      m.isActive && m.fullName.toLowerCase().includes(lowerName)
    );
  };

  const getMemberAllocations = (memberId: string) => {
    const sprint = getCurrentSprint();
    return allocations
      .filter(a => 
        a.productManagerId === memberId &&
        a.year === sprint.year &&
        a.month === sprint.month &&
        a.sprint === sprint.sprint
      )
      .map(a => {
        const project = projects.find(p => p.id === a.projectId);
        return {
          projectName: project ? `${project.customerName} - ${project.projectName}` : 'Unknown',
          percentage: a.allocationPercentage,
        };
      });
  };

  const getAvailableMembersByRole = (role: string) => {
    const lowerRole = role.toLowerCase();
    const available = getAvailableMembers();
    return available.filter(m => m.role.toLowerCase().includes(lowerRole));
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    addUserMessage(input);
    processQuery(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (showGuide) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border-2 border-blue-500 flex flex-col z-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h3 className="font-bold text-lg">📖 Assistant Guide</h3>
          <button onClick={() => setShowGuide(false)} className="text-white hover:text-gray-200">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">📊 Navigation</h4>
              <p className="text-gray-600 text-xs mb-1">• "show dashboard"</p>
              <p className="text-gray-600 text-xs mb-1">• "show capacity planning"</p>
              <p className="text-gray-600 text-xs">• "show my projects"</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">👥 Find People</h4>
              <p className="text-gray-600 text-xs mb-1">• "who is over capacity?"</p>
              <p className="text-gray-600 text-xs mb-1">• "who is available?"</p>
              <p className="text-gray-600 text-xs">• "find [member name]"</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">📁 Projects</h4>
              <p className="text-gray-600 text-xs mb-1">• "which projects are missing resources?"</p>
              <p className="text-gray-600 text-xs mb-1">• "show pending projects"</p>
              <p className="text-gray-600 text-xs">• "show [project name]"</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">📈 Statistics</h4>
              <p className="text-gray-600 text-xs mb-1">• "what's our average utilization?"</p>
              <p className="text-gray-600 text-xs mb-1">• "how many active projects?"</p>
              <p className="text-gray-600 text-xs">• "how many team members?"</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">🔍 Search</h4>
              <p className="text-gray-600 text-xs mb-1">• "find available Product Managers"</p>
              <p className="text-gray-600 text-xs">• "find available [resource type]"</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">➕ Quick Actions</h4>
              <p className="text-gray-600 text-xs mb-1">• "create new project"</p>
              <p className="text-gray-600 text-xs">• "add team member"</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Type "help" anytime to see available commands!
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 border-t">
          <button
            onClick={() => setShowGuide(false)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
          title="Open AI Assistant"
        >
          <span className="text-2xl">💬</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border-2 border-blue-500 flex flex-col z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">🤖 Puzzle Assistant</h3>
              <p className="text-xs text-blue-100">Your capacity planning helper</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGuide(true)}
                className="text-white hover:text-gray-200 text-sm"
                title="View Guide"
              >
                📖
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={action.onClick}
                          className="block w-full text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Type "help" for commands • "📖" for guide
            </p>
          </div>
        </div>
      )}
    </>
  );
}
