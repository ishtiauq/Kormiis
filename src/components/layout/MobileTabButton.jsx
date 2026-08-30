export default function MobileTabButton({ active, label, onClick, children, badge, className ="" }) {
  return (
    <button
      role="tab"
      aria-label={label}
      title={label}
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center justify-center border-0 cursor-pointer size-11 rounded-full transition-all duration-300 outline-none select-none tap-highlight-transparent active:scale-90 ${
        active 
          ? 'text-primary scale-105' 
          : 'text-foreground/70 hover:text-foreground'
      } ${className}`}
    >
      <div className="size-6 flex items-center justify-center shrink-0">
        {children}
      </div>
      {badge}
      <style>{`
        button[role="tab"][aria-selected="false"] .msr {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0 !important;
        }
        button[role="tab"][aria-selected="true"] .msr {
          font-variation-settings: "FILL" 1, "wght" 600, "GRAD" 0 !important;
        }
      `}</style>
    </button>
  )
}
