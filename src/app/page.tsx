import Link from "next/link";
import { BrandLockup, PillarStrip } from "../components/HealthTwinBrand";

const areas = [
  { title: "Courses", description: "Engineering lessons and course materials.", image: "data-ai.png", category: "LEARN" },
  { title: "HEMOX Research Suite", description: "Wearable sensing and physiological analysis.", image: "sensing.png", category: "SENSING" },
  { title: "SILO RFIC Design", description: "Spectre-in-the-Loop research and design automation.", image: "silo.png", category: "IC DESIGN" },
  { title: "Software & APK", description: "Research software and Android applications.", image: "software-app.svg", category: "SOFTWARE" },
  { title: "Firmware", description: "Embedded systems firmware and device resources.", image: "ic-design.png", category: "BUILD" },
  { title: "Datasets & Explorers", description: "Research data and interactive analysis tools.", image: "digital-twin.png", category: "ANALYZE" },
];

export default function Home() {
  return (
    <main className="research-shell healthtwin-home text-white">
      <header className="healthtwin-topbar">
        <div className="healthtwin-container healthtwin-topbar-inner">
          <BrandLockup />
          <nav aria-label="Main navigation" className="healthtwin-top-links">
            <a href="#pillars">Research areas</a><a href="#resources">Resources</a><Link href="/contact">Contact</Link>
          </nav>
          <div className="healthtwin-top-actions"><Link href="/login" className="research-btn-secondary">Sign in</Link><Link href="/register" className="research-btn-primary">Request access</Link></div>
        </div>
      </header>
      <section className="healthtwin-hero" aria-labelledby="home-title">
        <div className="healthtwin-container healthtwin-hero-inner">
          <p className="healthtwin-eyebrow">ENGINEERING · SENSING · DATA · HUMAN HEALTH</p>
          <h1 id="home-title">From Silicon to <span>Intelligent Healthcare</span></h1>
          <p className="healthtwin-hero-lead">An integrated engineering research platform. Explore real tools, courses, software and research resources in one connected workspace.</p>
          <div className="healthtwin-hero-actions"><Link href="/register" className="research-btn-primary">Request research access <span aria-hidden="true">↗</span></Link><Link href="/login" className="research-btn-secondary">Open your workspace</Link></div>
          <p className="healthtwin-hero-footnote">Learn · Design · Build · Experiment · Analyze · Impact</p>
        </div>
      </section>
      <section id="pillars" className="healthtwin-container healthtwin-pillar-section" aria-label="Research journey">
        <div className="healthtwin-section-heading"><p className="healthtwin-eyebrow">ONE CONNECTED RESEARCH JOURNEY</p><h2>Five pillars. One research nexus.</h2></div>
        <PillarStrip />
      </section>
      <section id="resources" className="healthtwin-container healthtwin-resource-section">
        <div className="healthtwin-section-heading"><p className="healthtwin-eyebrow">EXPLORE THE PLATFORM</p><h2>Research starts with curiosity.</h2><p>Discover existing modules and request access to the resources relevant to your work.</p></div>
        <div className="healthtwin-feature-grid">{areas.map((area) => <Link key={area.title} href="/login" className="healthtwin-feature-card">
          <div className="healthtwin-feature-image" style={{backgroundImage: `linear-gradient(0deg, #061726 0%, rgba(6,23,38,.02) 80%),url('/healthtwin/${area.image}')`}} />
          <div className="healthtwin-feature-body"><span className="healthtwin-eyebrow">{area.category}</span><h3>{area.title}</h3><p>{area.description}</p><span className="healthtwin-feature-action">Explore resource <span aria-hidden="true">↗</span></span></div>
        </Link>)}</div>
      </section>
      <section className="healthtwin-container healthtwin-join"><div><p className="healthtwin-eyebrow">JOIN THE RESEARCH COMMUNITY</p><h2>Turn ideas into impact.</h2><p>Request research access. Access begins after administrator approval.</p></div><Link href="/register" className="research-btn-primary">Request access →</Link></section>
      <footer className="healthtwin-footer healthtwin-container"><BrandLockup compact /><span>From Silicon to Intelligent Healthcare · <Link href="/contact" className="text-cyan-300">Contact Us</Link></span></footer>
    </main>
  );
}
