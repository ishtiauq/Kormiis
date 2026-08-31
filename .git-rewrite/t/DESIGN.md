# HR Pulse Design System (DESIGN.md)

This file contains the structured design rules and styling tokens for the **HR Pulse** web application, utilizing the **macOS 27 Liquid Glass** design language.

## Visual Theme: macOS 27 Liquid Glass (System Responsive)
Inspired by macOS 27, this design leverages translucent backgrounds, vibrant gradients, and pronounced background blurs to create a sense of depth. It embraces smooth micro-animations and system-native typography.

### 1. Color Palette

```json
{
  "theme": "Liquid Glass (Light / System Responsive)",
  "colors": {
    "background": {
      "app": "linear-gradient(135deg, #e0eafc, #cfdef3)", /* Vibrant ambient background */
      "card": "rgba(255, 255, 255, 0.4)",            /* Translucent card base */
      "cardHover": "rgba(255, 255, 255, 0.5)",
      "sidebar": "rgba(240, 242, 245, 0.6)"          /* Translucent sidebar */
    },
    "text": {
      "primary": "rgba(0, 0, 0, 0.85)",              /* System Black */
      "secondary": "rgba(0, 0, 0, 0.55)",            /* System Gray */
      "muted": "rgba(0, 0, 0, 0.35)"
    },
    "accents": {
      "primary": "#007aff",                          /* macOS Blue */
      "primaryHover": "#005bb5",
      "info": "#32ade6",                             /* macOS Cyan */
      "success": "#34c759",                          /* macOS Green */
      "warning": "#ff9500",                          /* macOS Orange */
      "danger": "#ff3b30"                            /* macOS Red */
    },
    "borders": {
      "glass": "rgba(255, 255, 255, 0.6)",
      "innerHighlight": "rgba(255, 255, 255, 0.8)"
    },
    "shadows": {
      "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
    }
  }
}
```

### 2. Typography
- **Primary Font Family**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Scale (Standard macOS)**:
  - Main Title: `2rem` (Bold, 700)
  - Section Title: `1.5rem` (Semi-Bold, 600)
  - Subheadings: `1.2rem` (Medium, 500)
  - Body Text: `1rem` (Regular, 400)
  - Caption/Muted Details: `0.85rem` (Regular, 400)

### 3. Component Styling

#### Cards (.glass-card)
- Background: `rgba(255, 255, 255, 0.4)`
- Backdrop Filter: `blur(20px) saturate(150%)`
- Border: `1px solid rgba(255, 255, 255, 0.6)`
- Border Radius: `16px`
- Box Shadow: `0 8px 32px 0 rgba(31, 38, 135, 0.07)`
- Inner Highlight (pseudo-element for extra 3D effect): Top border `1px solid rgba(255, 255, 255, 0.9)`

#### Buttons (.mac-btn)
- **Primary Buttons**:
  - Background: `#007aff`
  - Color: `#ffffff`
  - Border Radius: `8px`
  - Padding: `8px 16px`
  - Font Weight: `500`
  - Shadow: `0 2px 4px rgba(0, 122, 255, 0.3)`
- **Secondary Buttons (.mac-btn-secondary)**:
  - Background: `rgba(255, 255, 255, 0.5)`
  - Backdrop Filter: `blur(10px)`
  - Color: `rgba(0, 0, 0, 0.85)`
  - Border: `1px solid rgba(255, 255, 255, 0.6)`

### 4. Layout & Spacing Scale
- Page Padding: `32px` (slightly tighter for macOS feel)
- Grid gaps: `20px`
- Border Radius Scale: `8px` (controls), `12px` (modals), `16px` (main cards)
