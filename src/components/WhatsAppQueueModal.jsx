import { useState, useEffect, useCallback, useRef } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  WA_QUEUE_EVENT,
  getPendingWhatsAppQueue,
  clearPendingWhatsAppQueue,
  openWhatsAppDirect,
  getWhatsAppOptInLink,
  logWhatsAppDelivery,
} from '../services/whatsappService.js'

const GAP_MS = 2200

function copyText(text) {
  if (!text) return false
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
  }
  return fallbackCopy(text)
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function downloadCsv(queue) {
  const rows = [
    ['Employee', 'Phone', 'Status', 'WhatsApp Link'],
    ...queue.items.map((i) => [i.employeeName || '', i.phone, i.optedIn ? 'Opted-in' : 'Opt-in needed', i.link]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `whatsapp-queue-${queue.queueId || Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Global 1-Click WhatsApp delivery wizard.
 * Rendered once at the app root. Listens for WA_QUEUE_EVENT (raised by
 * queueWhatsAppMessages) and walks HR through each recipient with a fresh
 * user gesture — zero popup blockers, zero WhatsApp spam flags.
 */
export default function WhatsAppQueueModal({ settings }) {
  const [queue, setQueue] = useState(null)
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const queueRef = useRef(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const handleQueue = useCallback((payload) => {
    queueRef.current = payload
    setQueue(payload)
    setIndex(0)
    setDone(0)
    setSkipped(0)
    setCopied(false)
    setBusy(false)
  }, [])

  useEffect(() => {
    // Resume an unfinished queue after a page refresh.
    const pending = getPendingWhatsAppQueue()
    if (pending) handleQueue(pending)
    window.addEventListener(WA_QUEUE_EVENT, (e) => handleQueue(e.detail))
    return () => window.removeEventListener(WA_QUEUE_EVENT, handleQueue)
  }, [handleQueue])

  const current = queue?.items?.[index] || null
  const companyName = settingsRef.current?.company?.name || 'Kormiis HR'
  const businessPhone = settingsRef.current?.whatsapp?.businessPhone || ''

  const advance = useCallback((status) => {
    setQueue((prev) => {
      if (!prev) return prev
      if (status === 'opened') setDone((d) => d + 1)
      if (status === 'skipped') setSkipped((s) => s + 1)
      const nextIndex = index + 1
      if (nextIndex >= prev.items.length) {
        clearPendingWhatsAppQueue()
        queueRef.current = null
        setTimeout(() => setQueue(null), 650)
        return prev
      }
      setIndex(nextIndex)
      return prev
    })
  }, [index])

  const handleOpen = async () => {
    if (!current || busy) return
    setBusy(true)
    // Log before opening so a popup failure still records intent.
    await logWhatsAppDelivery(queue.companyUid, {
      phone: current.phone,
      employeeName: current.employeeName,
      event: current.event,
      message: current.message,
      status: current.optedIn ? 'opened' : 'optin_sent',
      createdBy: current.createdBy,
      createdByRole: current.createdByRole,
    })
    openWhatsAppDirect(current.phone, current.message)
    setTimeout(() => {
      setBusy(false)
      advance('opened')
    }, GAP_MS)
  }

  const handleSkip = async () => {
    if (!current || busy) return
    setBusy(true)
    await logWhatsAppDelivery(queue.companyUid, {
      phone: current.phone,
      employeeName: current.employeeName,
      event: current.event,
      message: current.message,
      status: 'skipped',
      createdBy: current.createdBy,
      createdByRole: current.createdByRole,
    })
    setTimeout(() => {
      setBusy(false)
      advance('skipped')
    }, 400)
  }

  const handleCopyMessage = async () => {
    const ok = await copyText(current?.message || '')
    setCopied(ok)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleOptInLink = () => {
    if (!current?.optedIn && businessPhone) {
      const link = getWhatsAppOptInLink(businessPhone, companyName)
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
    }
  }

  const progressPct = queue ? Math.round((index / queue.total) * 100) : 0
  const isFinished = queue && index >= queue.total

  return (
    <Dialog open={!!queue && !isFinished} onOpenChange={(open) => { if (!open) { clearPendingWhatsAppQueue(); setQueue(null) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="chat" size={20} className="text-emerald-500" />
            WhatsApp Delivery Wizard
          </DialogTitle>
          <DialogDescription>
            One-tap at a time — safe from popup blockers and WhatsApp spam flags.
          </DialogDescription>
        </DialogHeader>

        {queue && (
          <div className="flex flex-col gap-4 py-2">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                {index + 1}/{queue.total}
              </span>
            </div>

            {/* Current recipient */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-border/60 dark:border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon name="person" size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{current?.employeeName || 'Team Member'}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">+{current?.phone || ''}</div>
                  </div>
                </div>
                {current?.optedIn ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Icon name="verified" size={11} /> Opted-in
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                    <Icon name="campaign" size={11} /> Opt-in needed
                  </span>
                )}
              </div>

              <div className="max-h-32 overflow-y-auto rounded-xl bg-muted/40 dark:bg-white/5 border border-border/40 dark:border-white/8 p-3">
                <p className="text-[11px] text-foreground/90 whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {current?.message || ''}
                </p>
              </div>

              {!current?.optedIn && (
                <button
                  type="button"
                  onClick={handleOptInLink}
                  className="w-full flex items-center gap-2 text-[11px] font-semibold text-primary hover:underline"
                >
                  <Icon name="qr_code_2" size={14} />
                  Not opted-in yet — open their 1-tap START link first (keeps you ban-free)
                </button>
              )}
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Icon name="monitoring" size={14} className="animate-spin" />
                Opening WhatsApp… next in {Math.round(GAP_MS / 1000)}s
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleCopyMessage} disabled={busy || !current}>
              <Icon name={copied ? 'check' : 'content_copy'} size={14} />
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { if (queue) downloadCsv(queue) }} disabled={!queue} className="flex-1 sm:flex-none">
              <Icon name="download" size={14} />
              CSV
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleSkip} disabled={busy || !current} className="flex-1 sm:flex-none text-muted-foreground">
              <Icon name="skip_next" size={14} />
              Skip
            </Button>
          </div>
          <Button type="button" className="flex-1 sm:flex-none sm:min-w-[150px]" onClick={handleOpen} disabled={busy || !current}>
            <Icon name={busy ? 'monitoring' : 'chat'} size={15} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Opening…' : 'Open in WhatsApp'}
          </Button>
        </DialogFooter>

        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground px-1">
          <span>
            Sent: <span className="font-bold text-emerald-500">{done}</span> · Skipped:{' '}
            <span className="font-bold text-muted-foreground">{skipped}</span>
          </span>
          <button type="button" onClick={() => { clearPendingWhatsAppQueue(); setQueue(null) }} className="hover:underline">
            Close & pause
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}