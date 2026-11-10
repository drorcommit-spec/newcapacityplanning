import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SprintLengthWeeks } from '../utils/weekUtils';

interface SprintPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Central editor for the sprint period (sprint length in weeks). Persists to the shared
// `capacitySprintLength` localStorage key and broadcasts `capacitySprintLengthChanged`, which
// all Capacity Planning views (Staff, Puzzle, Timeline) already listen to and sync from.
export default function SprintPeriodModal({ isOpen, onClose }: SprintPeriodModalProps) {
  const [length, setLength] = useState<SprintLengthWeeks>(
    () => (parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks)
  );

  // Re-read the current value whenever the modal opens so it reflects any external change.
  useEffect(() => {
    if (isOpen) {
      setLength(parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks);
    }
  }, [isOpen]);

  const options: { value: SprintLengthWeeks; label: string; desc: string }[] = [
    { value: 1, label: '1 week', desc: 'Each sprint spans a single week.' },
    { value: 2, label: '2 weeks', desc: 'Half-month sprints (1st–15th, 16th–end).' },
    { value: 3, label: '3 weeks', desc: 'Year-anchored 3-week blocks.' },
  ];

  const save = () => {
    localStorage.setItem('capacitySprintLength', String(length));
    window.dispatchEvent(new Event('capacitySprintLengthChanged'));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sprint Period">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Set how many weeks make up a sprint. This applies to all Capacity Planning views
          (Staff, Puzzle, Timeline).
        </p>

        <div className="space-y-2">
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="sprintPeriod"
                value={opt.value}
                checked={length === opt.value}
                onChange={() => setLength(opt.value)}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-sm text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-600">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
            Cancel
          </button>
          <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
