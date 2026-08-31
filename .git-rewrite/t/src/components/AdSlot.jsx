import { useEffect } from 'react'

export default function AdSlot({ type = 'horizontal', style = {} }) {
  useEffect(() => {
    // If in production, you can trigger Google Adsense push:
    // try {
    //   (window.adsbygoogle = window.adsbygoogle || []).push({});
    // } catch (e) {
    //   console.error("AdSense trigger failed:", e);
    // }
  }, [])

  // Dynamic layout styling depending on the ad type
  const isHorizontal = type === 'horizontal'
  const isCard = type === 'card'

  return (
    <div role="complementary" aria-label="Advertisement"
      className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden mt-5 w-full"
      style={{ minHeight: isHorizontal ? '90px' : isCard ? '160px' : '250px', ...style }}>
      {/* Label */}
      <span className="absolute top-1.5 left-3 text-[0.65rem] text-[var(--text-muted)] tracking-wide uppercase font-semibold">
        Advertisement
      </span>

      {/* Simulated/Mock Ad Content */}
      <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
        <div className="flex gap-2 items-center">
          {/* AdSense Logo Emblem */}
          <span className="bg-[var(--bg-tertiary)] text-[var(--accent-primary)] px-1.5 py-0.5 rounded text-[0.6rem] font-bold border border-[rgba(99,102,241,0.2)]">
            AdSense
          </span>
          <span className="text-[0.75rem] font-medium text-[var(--text-muted)]">
            Google Sponsor Banner
          </span>
        </div>
        <span className="text-[0.7rem] text-[var(--text-muted)]">
          (Keeps HR Pulse 100% Free)
        </span>
      </div>

      {/* Real AdSense Element Placeholder */}
      {/* 
        To enable real ads, uncomment the script in index.html, 
        and configure the fields below with your actual data-ad-client and data-ad-slot:
      */}
      <ins className="adsbygoogle block w-full h-full"
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="XXXXXXXXXX"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  )
}
