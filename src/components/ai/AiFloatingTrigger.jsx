import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import TooltipPopover from '../TooltipPopover.jsx'

export default function AiFloatingTrigger({ onClick, onNewChat, onToggleHistory, isOpen, isHistoryOpen, isDarkMode, isMobile = false }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleKeyDown = (e) => {
      // Shortcut: Ctrl + Space or Alt + A
      if ((e.ctrlKey && e.code === 'Space') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault()
        onClick()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClick])

  if (!mounted) return null

  return (
    <aside
      data-ai-trigger="true"
      aria-label="Floating AI Action Bar"
      className={`${
        isMobile
          ? 'flex flex-col fixed right-3 bottom-20 z-50 md:hidden rounded-2xl p-1.5 py-2.5 gap-1.5'
          : 'hidden xl:flex items-center fixed top-4 xl:top-5 right-4 sm:right-6 z-50 h-14 sm:h-16 px-3.5 sm:px-4.5 gap-2 sm:gap-2.5 rounded-full'
      } glass-apple text-foreground shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] select-none border border-white/30 dark:border-white/12`}
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Main AI Toggle Button (Monochrome Liquid Glass) */}
      <TooltipPopover label={isOpen ? "Close Kormiis AI" : "Kormiis AI (Ctrl+Space)"} isCollapsed={true} isDarkMode={isDarkMode}>
        <button
          onClick={onClick}
          aria-label="Toggle Kormiis AI"
          className={`relative size-9 sm:size-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 border ${
            isOpen
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-md rotate-90 scale-102'
              : 'bg-white/70 dark:bg-white/[0.12] text-foreground border-white/40 dark:border-white/20 hover:bg-white/90 dark:hover:bg-white/[0.22] hover:border-white/60 dark:hover:border-white/30 shadow-xs hover:scale-105'
          }`}
        >
          {isOpen ? (
            <Icon name="close" size={19} className="text-white dark:text-neutral-900 !text-white dark:!text-neutral-900" />
          ) : (
            <Icon name="auto_awesome" size={18} className="animate-spin-slow text-foreground" />
          )}
        </button>
      </TooltipPopover>

      {/* 2. New Chat Action Button */}
      <TooltipPopover label="New Conversation" isCollapsed={true} isDarkMode={isDarkMode}>
        <button
          onClick={onNewChat || onClick}
          aria-label="Start New Chat"
          className="size-9 sm:size-10 rounded-full flex items-center justify-center cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/20 dark:hover:bg-white/[0.08] border border-white/15 dark:border-white/10 hover:border-white/30 dark:hover:border-white/20 active:scale-95 transition-all duration-200"
        >
          <Icon name="add" size={19} />
        </button>
      </TooltipPopover>

      {/* 3. History Drawer Action Button (Toggles History Drawer) */}
      <TooltipPopover label={isHistoryOpen ? "Close History" : "Chat History"} isCollapsed={true} isDarkMode={isDarkMode}>
        <button
          onClick={onToggleHistory || onClick}
          aria-label="Toggle Chat History"
          className={`size-9 sm:size-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 border ${
            isHistoryOpen && isOpen
              ? 'bg-foreground/15 text-foreground border-foreground/30 shadow-2xs font-bold'
              : 'text-foreground/80 hover:text-foreground hover:bg-white/20 dark:hover:bg-white/[0.08] border-white/15 dark:border-white/10 hover:border-white/30 dark:hover:border-white/20'
          }`}
        >
          <Icon name="history" size={19} className={isHistoryOpen && isOpen ? 'text-foreground' : ''} />
        </button>
      </TooltipPopover>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </aside>
  )
}
