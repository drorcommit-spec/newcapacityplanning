import { useState, useEffect } from 'react';

const VERSION = '1.1.0'; // Manager Filter Feature
const BUILD_DATE = new Date().toISOString().split('T')[0];

export default function VersionDisplay() {
  const [gitCommit, setGitCommit] = useState<string>('');

  useEffect(() => {
    // Try to get git commit from environment variable (set by Vercel)
    const commit = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local';
    setGitCommit(commit);
  }, []);

  return (
    <div className="fixed bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded shadow-sm">
      v{VERSION} {gitCommit !== 'local' && `(${gitCommit})`}
      {gitCommit === 'local' && ' - Local Dev'}
    </div>
  );
}
