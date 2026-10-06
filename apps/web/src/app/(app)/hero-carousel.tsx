'use client'

import { useRef, useState, type ReactNode } from 'react'

// Carrossel arrastável entre os cards do hero (ritmo, saldo de benefício...) — scroll nativo com snap,
// sem biblioteca de drag; os pontinhos só refletem a posição do scroll, nunca a controlam. Com um card só,
// não vira carrossel (sem pontinho sozinho, sem scroll à toa).
export function HeroCarousel({ cards }: { cards: { key: string; content: ReactNode }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  if (cards.length === 0) return null
  if (cards.length === 1) return <>{cards[0]!.content}</>

  const onScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <div key={card.key} className="w-full flex-shrink-0 snap-center">
            {card.content}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {cards.map((card, index) => (
          <span
            key={card.key}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${index === activeIndex ? 'bg-ink' : 'bg-border'}`}
          />
        ))}
      </div>
    </div>
  )
}
