import { ErrorTechGridPattern } from '@/components/errors/error-tech-grid-pattern'

export function TechAmbientBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="error-tech-surface absolute inset-0" />
      <div className="login-tech-mesh absolute inset-0 opacity-80" />

      <div className="error-tech-blob error-tech-blob-a" />
      <div className="error-tech-blob error-tech-blob-b" />
      <div className="error-tech-blob error-tech-blob-c" />

      <div className="error-tech-glow error-tech-glow-a" />
      <div className="error-tech-glow error-tech-glow-b" />

      <div className="login-tech-scan absolute inset-0 opacity-[0.12]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% 16%, rgba(1,222,162,0.12), transparent 38%), radial-gradient(circle at 88% 12%, rgba(1,99,92,0.14), transparent 42%)',
        }}
      />
      <div className="login-tech-dim absolute inset-0 opacity-55" />
      <ErrorTechGridPattern />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 90% at 50% 100%, rgba(3,10,12,0.88) 0%, transparent 62%)',
        }}
      />
    </div>
  )
}