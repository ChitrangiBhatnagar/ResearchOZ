import * as React from 'react'

export function MiniCalendar() {
  const days = Array.from({ length: 28 }).map((_, i) => i + 1)
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-zinc-200">December 2024</div>
        <div className="text-[10px] text-zinc-400">05 in progress • 07 finished • 11 waiting</div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-zinc-300">
        {days.map((d) => (
          <div key={d} className="flex items-center justify-center h-6 rounded-md bg-zinc-900/40">
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MiniCalendar
