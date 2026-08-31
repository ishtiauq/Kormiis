# Document Category CRUD

**Date**: 2026-07-26
**Status**: Design (approved)
**Component**: `src/components/Documents.jsx`

## Problem

Document categories are hardcoded as a `const` array (`CATEGORIES`). Users cannot add, edit, or delete categories.

## Solution

Move categories from `const` to `useState`, and add inline CRUD controls inside the category bar.

## State Changes

- `categories` — `useState` replacing the module-level `const CATEGORIES`. Initial value is the existing 5 categories.
- `showCategoryModal` — boolean for the add/edit modal
- `editingCategory` — the category object being edited (null for add mode)

Each category object: `{ id: string, label: string, color: string, icon: LucideIcon }`

## UI Layout

The category filter bar becomes:

```
[ All ] [ HR Docs ✏️❌ ] [ Policies ✏️❌ ] [ Forms ✏️❌ ] … [ + ]
```

### Hover-reveal actions
- Each category button (when not selected) shows small pencil (✏️) and X (❌) icons on hover
- Clicking ✏️ opens the edit modal with category label + color pre-filled
- Clicking ❌ shows a confirmation prompt
- The "All" button is not editable
- The "Other" (fallback) category is **protected** — cannot be deleted

### Add button
- A "+" button always visible at the end of the category row
- Clicking opens the add modal (empty label, default color)

## Add/Edit Modal

Small modal (reuse existing modal pattern) with:

1. **Name input** — text field, required
2. **Color picker** — row of 6 predefined color swatches:
   - `#3b82f6` (blue)
   - `#10b981` (green)
   - `#8b5cf6` (purple)
   - `#ec4899` (pink)
   - `#64748b` (gray)
   - `#f59e0b` (amber)
3. Save/Cancel buttons

### Icon auto-assignment
- Available icons: `Folder`, `FileText`, `FileSpreadsheet`, `FileImage`, `FileArchive`, `File`
- New categories get assigned `File` by default
- Existing categories keep their current icon

### ID generation
New categories get `cat-${Date.now()}` as their ID.

## Delete Behavior

- If no documents use the category → delete immediately
- If documents use the category → reassign those documents to the first available category in the list (or "Other"), then delete
- "Other" category cannot be deleted

## Migration

- `getCategoryInfo(catId)` continues to work with the state array
- `filteredDocs` and `selectedCategory` logic unchanged
- Category selection in Upload modal reads from state array

## Files Changed

- `src/components/Documents.jsx` — all changes in one file
