import { notFound } from 'next/navigation'

export default function Test500Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  throw new Error('Prueba 500')
}
