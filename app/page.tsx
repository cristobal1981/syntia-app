import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SectionShell } from "@/components/layout/section-shell"
import { MarketingButton } from "@/components/ui/marketing-button"
import { site } from "@/content/site"

export default function HomePage() {
  return (
    <main>
      <SectionShell className="bg-hero-gradient py-24 md:py-32">
        <div className="flex flex-col items-center text-center">
          <div className="badge-on-dark mb-6">
            <span className="badge-label-on-dark">{site.hero.badge}</span>
          </div>
          <Image
            src={site.brand.logoSrc}
            alt={site.brand.name}
            width={64}
            height={64}
            className="mb-8"
            priority
          />
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-on-dark sm:text-5xl md:text-6xl">
            {site.hero.title}{" "}
            <span className="text-primary">{site.hero.titleHighlight}</span>
          </h1>
          <p className="prose-width mb-4 text-lg text-muted-on-dark">
            {site.brand.claim}
          </p>
          <p className="prose-width mb-10 text-base text-muted-on-dark">
            {site.hero.description}
          </p>
          <MarketingButton asChild size="lg" className="px-8">
            <Link href={site.hero.cta.href}>
              {site.hero.cta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </MarketingButton>
        </div>
      </SectionShell>

      <SectionShell className="section-cta-brisa">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-cta-brisa-title mb-4">
            {site.lightSection.title}
          </h2>
          <p className="section-cta-brisa-body mb-8">
            {site.lightSection.description}
          </p>
          <MarketingButton
            asChild
            size="lg"
            marketingVariant="brisa"
            className="px-8"
          >
            <Link href={site.lightSection.cta.href}>
              {site.lightSection.cta.label}
            </Link>
          </MarketingButton>
        </div>
      </SectionShell>
    </main>
  )
}
