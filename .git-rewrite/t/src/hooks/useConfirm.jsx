import { useState, useCallback, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', destructive: false, confirmText: 'Continue' })
  const resolveRef = useRef(null)

  const confirm = useCallback((message, title = 'Are you sure?', opts = {}) => {
    const { destructive = false, confirmText = destructive ? 'Delete' : 'Continue' } = opts
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, title, message, destructive, confirmText })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    setState({ open: false, title: '', message: '', destructive: false, confirmText: 'Continue' })
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    setState({ open: false, title: '', message: '', destructive: false, confirmText: 'Continue' })
  }, [])

  const ConfirmDialog = () => (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.message && <AlertDialogDescription>{state.message}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={state.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {state.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}
