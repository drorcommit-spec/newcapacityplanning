import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getMonthName } from '../utils/dateUtils';
import Card from '../components/Card';

export default function AllocationHistory() {
  const { history, teamMembers, projects } = useData();

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => 
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [history]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangedByName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    return member?.fullName || 'Unknown User';
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'Unknown';
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.customerName} - ${project.projectName}` : 'Unknown';
  };

  const getPMName = (pmId?: string) => {
    if (!pmId) return 'Unknown';
    const pm = teamMembers.find(m => m.id === pmId);
    return pm?.fullName || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Allocation History</h1>

      <Card>
        <div className="space-y-4">
          {sortedHistory.map(entry => (
            <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {entry.changeType === 'created' && '✓ Allocation Created'}
                    {entry.changeType === 'updated' && '✎ Allocation Updated'}
                    {entry.changeType === 'deleted' && '✕ Allocation Deleted'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    By {getChangedByName(entry.changedBy)} on {formatDate(entry.changedAt)}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  entry.changeType === 'created' ? 'bg-green-100 text-green-800' :
                  entry.changeType === 'updated' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {entry.changeType}
                </span>
              </div>

              {entry.oldValue && (
                <div className="mt-2 text-sm">
                  <div className="text-gray-600">Previous:</div>
                  <div className="ml-4">
                    <div>PM: {getPMName(entry.oldValue.productManagerId)}</div>
                    <div>Project: {getProjectName(entry.oldValue.projectId)}</div>
                    <div>Sprint: {entry.oldValue.year} - {getMonthName(entry.oldValue.month || 1)} - S{entry.oldValue.sprint}</div>
                    <div>Allocation: {entry.oldValue.allocationPercentage}%</div>
                  </div>
                </div>
              )}

              {entry.newValue && entry.changeType !== 'deleted' && (
                <div className="mt-2 text-sm">
                  <div className="text-gray-600">{entry.changeType === 'created' ? 'Details:' : 'New:'}</div>
                  <div className="ml-4">
                    <div>PM: {getPMName(entry.newValue.productManagerId)}</div>
                    <div>Project: {getProjectName(entry.newValue.projectId)}</div>
                    <div>Sprint: {entry.newValue.year} - {getMonthName(entry.newValue.month || 1)} - S{entry.newValue.sprint}</div>
                    <div>Allocation: {entry.newValue.allocationPercentage}%</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {sortedHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">No history yet</div>
          )}
        </div>
      </Card>
    </div>
  );
}
