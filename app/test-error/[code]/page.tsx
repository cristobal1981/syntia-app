import { forbidden, notFound, unauthorized } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

// Solo local y previews de Vercel: /test-error/401|403|404|500 dispara cada pantalla de error.
// Los previews compilan con NODE_ENV=production, por eso se distingue con VERCEL_ENV.
export default function TestErrorPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={null}>
      <TestErrorBody params={params} />
    </Suspense>
  )
}

async function TestErrorBody({ params }: { params: Promise<{ code: string }> }): Promise<never> {
  await connection()

  if (process.env.VERCEL_ENV === 'production') return notFound()

  const { code } = await params
  if (code === '401') unauthorized()
  if (code === '403') forbidden()
  if (code === '500') throw new Error('Prueba 500')
  return notFound()
}
