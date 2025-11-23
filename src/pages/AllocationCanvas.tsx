import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CapacityOverview from '../components/CapacityOverview';

export default function AllocationCanvas() {
  const [searchParams] = useSearchParams();
  const [capacityViewMode, setCapacityViewMode] = useState<'team' | 'project' | undefined>(undefined);
  const [capacitySelectedProjects, setCapacitySelectedProjects] = useState<string[] | undefined>(undefined);
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'under' | 'over' | 'good' | undefined>(undefined);
  const [capacityUnderThreshold, setCapacityUnderThreshold] = useState<number | undefined>(undefined);
  const [capacityOverThreshold, setCapacityOverThreshold] = useState<number | undefined>(undefined);
  const [highlightMemberId, setHighlightMemberId] = useState<string | undefined>(undefined);

  // Handle URL parameters for filtering
  useEffect(() => {
    const view = searchParams.get('view');
    const mode = searchParams.get('mode');
    const projectsParam = searchParams.get('projects');
    const filter = searchParams.get('filter');
    const underThreshold = searchParams.get('underThreshold');
    const overThreshold = searchParams.get('overThreshold');
    const highlightMember = searchParams.get('highlightMember');
    
    // Handle capacity overview parameters for project view
    if (view === 'capacity' && mode === 'project' && projectsParam) {
      const projectIds = projectsParam.split(',');
      setCapacityViewMode('project');
      setCapacitySelectedProjects(projectIds);
    }
    
    // Handle capacity overview parameters for team view with filter
    if (view === 'capacity' && mode === 'team' && filter) {
      setCapacityViewMode('team');
      setCapacityFilter(filter as 'under' | 'over');
      if (underThreshold) setCapacityUnderThreshold(Number(underThreshold));
      if (overThreshold) setCapacityOverThreshold(Number(overThreshold));
    }
    
    // Handle member highlight
    if (highlightMember) {
      setCapacityViewMode('team');
      setHighlightMemberId(highlightMember);
      
      // Scroll to member after a short delay to ensure rendering
      setTimeout(() => {
        const element = document.getElementById(`member-${highlightMember}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightMemberId(undefined);
      }, 3300);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Allocation Board</h1>
      <CapacityOverview 
        key={`${capacitySelectedProjects?.join(',') || 'default'}-${capacityFilter || 'all'}`}
        initialViewMode={capacityViewMode}
        initialSelectedProjects={capacitySelectedProjects}
        initialCapacityFilter={capacityFilter}
        initialUnderThreshold={capacityUnderThreshold}
        initialOverThreshold={capacityOverThreshold}
        highlightMemberId={highlightMemberId}
      />
    </div>
  );
}
