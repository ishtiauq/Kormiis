export default function MobileTabButton({ active, label, onClick, children, badge, className = "" }) {
  return (
    <button
      role="tab"
      aria-label={label}
      title={label}
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center justify-center border-0 cursor-pointer size-11 rounded-full transition-all duration-300 outline-none select-none tap-highlight-transparent active:scale-90 ${
        active 
          ? 'bg-primary/20 dark:bg-primary/30 text-primary border border-primary/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] scale-105' 
          : 'text-foreground/75 hover:text-foreground hover:bg-white/15 dark:hover:bg-white/[0.08] hover:border-white/10'
      } ${className}`}
    >
      {children}
      {badge}
      <style>{`
        button[role="tab"][aria-selected="false"] .msr {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0 !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        button[role="tab"][aria-selected="true"] .msr {
          font-variation-settings: "FILL" 1, "wght" 600, "GRAD" 0 !important;
          transform: scale(1.1);
        }
      `}</style>
    </button>
  )
}
