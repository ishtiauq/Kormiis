export default function MobileTabButton({ active, label, onClick, children, badge, className = "" }) {
  return (
    <button
      role="tab"
      aria-label={label}
      title={label}
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center justify-center border-0 cursor-pointer size-10 sm:size-11 rounded-full transition-all bg-transparent outline-none select-none tap-highlight-transparent ${active ? 'text-background' : 'text-background/60 hover:text-background'} ${className}`}
    >
      {children}
      {badge}
      <style>{`
        button[role="tab"][aria-selected="false"] .msr {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0 !important;
        }
        button[role="tab"][aria-selected="true"] .msr {
          font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0 !important;
        }
      `}</style>
    </button>
  )
}
