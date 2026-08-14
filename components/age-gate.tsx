'use client'

import { useEffect, useState } from 'react'

export default function AgeGate({ isAgeRestricted }: { isAgeRestricted: boolean }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!isAgeRestricted) return
    const ok = document.cookie.split('; ').some((c) => c.startsWith('agegate_ok='))
    setBlocked(!ok)
  }, [isAgeRestricted])

  if (!blocked) return null

  const confirm = () => {
    document.cookie = `agegate_ok=1; path=/; max-age=${60 * 60 * 24}`
    setBlocked(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-center">
      <div className="bg-white rounded-xl p-8 max-w-sm mx-4">
        <h2 className="text-xl font-bold text-gray-900">Are you 18 or older?</h2>
        <p className="mt-2 text-sm text-gray-500">You must be of legal age to view this store.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={confirm} className="px-5 py-2 rounded-lg bg-black text-white text-sm font-medium">Yes, enter</button>
          <a href="https://google.com" className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700">No, leave</a>
        </div>
      </div>
    </div>
  )
}
