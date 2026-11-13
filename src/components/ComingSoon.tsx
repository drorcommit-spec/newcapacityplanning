// Full-area watermark placeholder for pages that are not released yet.
export default function ComingSoon({ text = 'Coming soon...' }: { text?: string }) {
  return (
    <div
      className="relative flex items-center justify-center min-h-[70vh] select-none overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span
        className="text-6xl sm:text-8xl font-extrabold tracking-wide text-gray-300 opacity-70 -rotate-12 whitespace-nowrap"
      >
        {text}
      </span>
    </div>
  );
}
