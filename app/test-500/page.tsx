import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

export default function Test500Page() {
  return (
    <Suspense fallback={null}>
      <Test500Body />
    </Suspense>
  )
}

async function Test500Body(): Promise<never> {
  await connection()

  if (process.env.NODE_ENV === 'production') {
    return notFound()
  }

  throw new Error('Prueba 500')
}
