import Icon from "@/components/ui/Icon.jsx"

export default function CommandPalette({ showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem, getCategoryIcon }) {
  return (
    <>
      {showCommandPalette && (
        <div className="command-palette-overlay" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false) }}>
          <div className="command-palette">
            <div className="command-palette-search-wrapper p-3 sm:p-4">
              <Icon name="search" style={{ color: 'var(--muted-foreground)' }} size={18}/>
              <input
                autoFocus
                className="command-palette-input px-3 py-2 sm:px-4 sm:py-2.5"
                type="text"
                aria-label="Search commands"
                placeholder="Type a command or search..."
                value={commandSearch}
                onChange={(e) => {
                  setCommandSearch(e.target.value)
                  setPaletteIndex(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    e.stopPropagation()
                    setPaletteIndex(prev => (prev + 1) % filteredItems.length)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    e.stopPropagation()
                    setPaletteIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    selectPaletteItem(paletteIndex)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowCommandPalette(false)
                    setCommandSearch('')
                    setPaletteIndex(0)
                  }
                }}
              />
            </div>
            <div className="command-palette-list p-3 sm:p-4" role="listbox" aria-label="Search results">
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center" role="status" aria-live="polite" style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                  No results found.
                </div>
              ) : (
                (() => {
                  let lastCategory = null
                  return filteredItems.map((item, index) => {
                    const showHeader = item.category !== lastCategory
                    lastCategory = item.category
                    return (
                      <div key={item.id}>
                        {showHeader && (
                          <div className="command-palette-section-header px-3 py-1.5 sm:px-4 sm:py-2">
                            {item.category}
                          </div>
                        )}
                        <div
                          role="option"
                          aria-selected={paletteIndex === index}
                          id={item.id}
                          className={`command-palette-item p-2 sm:p-3 ${paletteIndex === index ? 'active' : ''}`}
                          onClick={() => selectPaletteItem(index)}
                          onMouseEnter={() => setPaletteIndex(index)}
                        >
                            <div className="command-palette-item-left gap-2 sm:gap-3">
                            <span className="command-palette-item-icon">
                              {getCategoryIcon(item.category, item.id)}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          <span className="command-palette-item-shortcut">
                            {item.category === 'Pages' ? '\u23CE' : (item.category === 'Employees' ? 'View' : 'Action')}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
