export default function TooltipPopover({ 
  label, 
  isCollapsed = true, 
  isDarkMode, 
  side,
  children 
}) {
  if (isCollapsed === false || !label) {
    return children
  }

  return (
    <div data-tooltip={label} className="contents">
      {children}
    </div>
  )
}
