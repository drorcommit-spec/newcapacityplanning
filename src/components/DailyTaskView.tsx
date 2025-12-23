import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SprintTask } from '../types';
import Modal from './Modal';
import { saveSprintTasksToSupabase, fetchSprintTasksFromSupabase, deleteSprintTaskFromSupabase } from '../services/supabaseApi';

interface SprintInfo {
  year: number;
  month: number;
  sprint: number;
}

interface DailyTaskViewProps {
  sprint: SprintInfo;
  onClose: () => void;
}

export default function DailyTaskView({ sprint, onClose }: DailyTaskViewProps) {
  const { teamMembers, projects } = useData();
  const { user } = useAuth();
  const currentUser = user || { email: 'unknown', fullName: 'Unknown User' };

  // Task management state
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SprintTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<SprintTask | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Form state for task creation/editing
  const [taskForm, setTaskForm] = useState({
    memberId: '',
    projectId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    priority: 'Medium' as SprintTask['priority'],
    status: 'Planned' as SprintTask['status'],
    estimatedHours: 8,
  });

  // Generate sprint dates (2 weeks)
  const sprintDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(sprint.year, sprint.month - 1, sprint.sprint === 1 ? 1 : 16);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [sprint]);

  // Filter active members and projects
  const activeMembers = useMemo(() => 
    teamMembers.filter(m => m.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers]
  );

  const activeProjects = useMemo(() => 
    projects.filter(p => !p.isArchived).sort((a, b) => a.customerName.localeCompare(b.customerName)),
    [projects]
  );

  // Load tasks on component mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const sprintTasks = await fetchSprintTasksFromSupabase(sprint);
        setTasks(sprintTasks);
      } catch (error) {
        console.error('Failed to load sprint tasks:', error);
      }
    };

    loadTasks();
  }, [sprint]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (selectedMember !== 'all' && task.memberId !== selectedMember) return false;
      if (selectedProject !== 'all' && task.projectId !== selectedProject) return false;
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
      return true;
    });
  }, [tasks, searchText, selectedMember, selectedProject, selectedPriority]);

  // Get tasks for a specific member and date
  const getTasksForMemberAndDate = (memberId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTasks.filter(task => 
      task.memberId === memberId &&
      dateStr >= task.startDate &&
      dateStr <= task.endDate
    );
  };

  // Handle task creation/editing
  const handleSaveTask = async () => {
    if (!taskForm.memberId || !taskForm.projectId || !taskForm.title || !taskForm.startDate || !taskForm.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const sprintId = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
    const taskData: SprintTask = {
      id: editingTask?.id || crypto.randomUUID(),
      ...taskForm,
      sprintId,
      createdBy: currentUser.email,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save to database
      await saveSprintTasksToSupabase([taskData]);
      
      // Update local state
      if (editingTask) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? taskData : t));
      } else {
        setTasks(prev => [...prev, taskData]);
      }

      resetTaskForm();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      memberId: '',
      projectId: '',
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      priority: 'Medium',
      status: 'Planned',
      estimatedHours: 8,
    });
    setEditingTask(null);
    setShowTaskModal(false);
  };

  const handleEditTask = (task: SprintTask) => {
    setTaskForm({
      memberId: task.memberId,
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      startDate: task.startDate,
      endDate: task.endDate,
      priority: task.priority,
      status: task.status,
      estimatedHours: task.estimatedHours || 8,
    });
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        // Delete from database
        await deleteSprintTaskFromSupabase(taskId);
        
        // Update local state
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  // Drag and drop handlers
  const handleTaskDragStart = (e: React.DragEvent, task: SprintTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCellDrop = async (e: React.DragEvent, memberId: string, date: Date) => {
    e.preventDefault();
    if (!draggedTask) return;

    const newStartDate = new Date(date);
    const taskDuration = draggedTask.endDate 
      ? Math.ceil((new Date(draggedTask.endDate).getTime() - new Date(draggedTask.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 1;
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + taskDuration - 1);

    const updatedTask = {
      ...draggedTask,
      memberId,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save to database
      await saveSprintTasksToSupabase([updatedTask]);
      
      // Update local state
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? updatedTask : t));
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to move task. Please try again.');
    }
    
    setDraggedTask(null);
  };

  // Get project color for task blocks
  const getProjectColor = (projectId: string) => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100'];
    const index = activeProjects.findIndex(p => p.id === projectId);
    return colors[index % colors.length] || 'bg-gray-100';
  };

  const getPriorityColor = (priority: SprintTask['priority']) => {
    switch (priority) {
      case 'Critical': return 'border-l-red-500';
      case 'High': return 'border-l-orange-500';
      case 'Medium': return 'border-l-blue-500';
      case 'Low': return 'border-l-gray-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Mobile Warning */}
      <div className="md:hidden bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <p className="text-sm text-yellow-800">
          📱 Daily Task View is optimized for desktop. Consider using a larger screen for the best experience.
        </p>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Sprint View</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Daily Task Management</h1>
              <p className="text-sm md:text-base text-gray-600">
                {sprint.year} - {new Date(sprint.year, sprint.month - 1).toLocaleDateString('en-US', { month: 'long' })} Sprint {sprint.sprint}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm md:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4 items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Members</option>
            {activeMembers.map(member => (
              <option key={member.id} value={member.id}>{member.fullName}</option>
            ))}
          </select>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            {activeProjects.map(project => (
              <option key={project.id} value={project.id}>{project.customerName} - {project.projectName}</option>
            ))}
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Date Headers */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <div className="flex">
              <div className="w-48 p-3 border-r border-gray-200 bg-gray-50">
                <span className="font-semibold text-gray-700">Team Member</span>
              </div>
              {sprintDates.map((date, index) => (
                <div key={index} className="w-32 p-3 border-r border-gray-200 text-center bg-gray-50">
                  <div className="font-semibold text-gray-700">{formatDate(date)}</div>
                  <div className="text-xs text-gray-500">{date.getDate()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Rows */}
          <div className="divide-y divide-gray-200">
            {activeMembers.map(member => (
              <div key={member.id} className="flex hover:bg-gray-50">
                {/* Member Info */}
                <div className="w-48 p-3 border-r border-gray-200 bg-white sticky left-0 z-10">
                  <div className="font-semibold text-gray-900">{member.fullName}</div>
                  <div className="text-xs text-gray-600">{member.role}</div>
                </div>

                {/* Date Cells */}
                {sprintDates.map((date, dateIndex) => {
                  const dayTasks = getTasksForMemberAndDate(member.id, date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  return (
                    <div 
                      key={dateIndex} 
                      className={`w-32 min-h-[80px] p-1 border-r border-gray-200 relative ${
                        isWeekend ? 'bg-gray-100' : 'bg-white'
                      }`}
                      onDragOver={handleCellDragOver}
                      onDrop={(e) => handleCellDrop(e, member.id, date)}
                    >
                      {dayTasks.map(task => {
                        const project = activeProjects.find(p => p.id === task.projectId);
                        const taskStartDate = new Date(task.startDate);
                        const taskEndDate = new Date(task.endDate);
                        const isFirstDay = date.toDateString() === taskStartDate.toDateString();
                        const isLastDay = date.toDateString() === taskEndDate.toDateString();
                        
                        return (
                          <div
                            key={task.id}
                            draggable
                            className={`mb-1 p-1 rounded text-xs cursor-move border-l-2 ${getProjectColor(task.projectId)} ${getPriorityColor(task.priority)} hover:shadow-md transition-shadow ${
                              draggedTask?.id === task.id ? 'opacity-50' : ''
                            }`}
                            onDragStart={(e) => handleTaskDragStart(e, task)}
                            onDragEnd={handleTaskDragEnd}
                            onClick={() => handleEditTask(task)}
                            title={`${task.title}\n${project?.customerName} - ${project?.projectName}\nPriority: ${task.priority}\nStatus: ${task.status}`}
                          >
                            <div className="font-medium truncate">{task.title}</div>
                            {project && (
                              <div className="text-gray-600 truncate">{project.customerName}</div>
                            )}
                            {isFirstDay && taskStartDate.toDateString() !== taskEndDate.toDateString() && (
                              <div className="text-xs text-gray-500">Start</div>
                            )}
                            {isLastDay && taskStartDate.toDateString() !== taskEndDate.toDateString() && (
                              <div className="text-xs text-gray-500">End</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={resetTaskForm}
        title={editingTask ? 'Edit Task' : 'Add New Task'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
              <select
                value={taskForm.memberId}
                onChange={(e) => setTaskForm(prev => ({ ...prev, memberId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Member</option>
                {activeMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={taskForm.projectId}
                onChange={(e) => setTaskForm(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Project</option>
                {activeProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.customerName} - {project.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional task description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={taskForm.startDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={taskForm.endDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as SprintTask['priority'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm(prev => ({ ...prev, status: e.target.value as SprintTask['status'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
              <input
                type="number"
                min="1"
                max="24"
                value={taskForm.estimatedHours}
                onChange={(e) => setTaskForm(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 8 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {editingTask && (
              <button
                onClick={() => handleDeleteTask(editingTask.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete Task
              </button>
            )}
            <button
              onClick={resetTaskForm}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}