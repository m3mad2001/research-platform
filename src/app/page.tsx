import Link from "next/link";
import { BrandLockup } from "../components/HealthTwinBrand";

const icons = {
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20" /></>,
  wave: <path d="M2 12h4l2-6 4 12 3-9 2 3h5" />,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  db: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  twin: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a5 5 0 0 0-3-4.5" /></>,
  impact: <><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></>,
  network: <><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="m6.5 7.5 3.5 3M17.5 7.5 14 10.5M6.5 16.5l3.5-3M17.5 16.5 14 13.5" /></>,
};

function Icon({ name }: { name: keyof typeof icons }) {
  return <span className="ax-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{icons[name]}</svg></span>;
}

const pillars: { label: string; icon: keyof typeof icons }[] = [
  { label: "IC Design", icon: "chip" },
  { label: "Sensing Systems", icon: "wave" },
  { label: "Data & AI", icon: "network" },
  { label: "Healthcare Digital Twin", icon: "twin" },
  { label: "Real-World Impact", icon: "impact" },
];

const areas: { title: string; description: string; category: string; icon: keyof typeof icons }[] = [
  { title: "Courses", description: "Engineering lessons and course materials.", category: "Learn", icon: "book" },
  { title: "HEMOX Research Suite", description: "Wearable sensing and physiological analysis.", category: "Sensing", icon: "wave" },
  { title: "SILO RFIC Design", description: "Spectre-in-the-Loop research and design automation.", category: "IC Design", icon: "chip" },
  { title: "Software & APK", description: "Research software and Android applications.", category: "Software", icon: "code" },
  { title: "Firmware", description: "Embedded systems firmware and device resources.", category: "Build", icon: "chip" },
  { title: "Datasets & Explorers", description: "Research data and interactive analysis tools.", category: "Analyze", icon: "db" },
];

export default function Home() {
  return (
    <main className="apple-home">
      <header className="ax-nav">
        <div className="ax-container ax-nav-inner">
          <BrandLockup compact />
          <nav aria-label="Main navigation" className="ax-links">
            <a href="#pillars">Research areas</a>
            <a href="#resources">Resources</a>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="ax-actions">
            <Link href="/login" className="ax-btn ax-btn-secondary ax-btn-sm">Sign in</Link>
            <Link href="/register" className="ax-btn ax-btn-primary ax-btn-sm">Request access</Link>
          </div>
        </div>
      </header>

      <section className="ax-container ax-hero" aria-labelledby="home-title">
        <p className="ax-eyebrow">Integrated Engineering Research Platform</p>
        <h1 id="home-title">From Silicon to <span>Intelligent Healthcare.</span></h1>
        <p className="ax-lead">
          Real tools, courses, software and research resources, together in one connected workspace.
        </p>
        <div className="ax-hero-actions">
          <Link href="/register" className="ax-btn ax-btn-primary ax-btn-lg">Request research access</Link>
          <Link href="/login" className="ax-btn ax-btn-secondary ax-btn-lg">Open your workspace ›</Link>
        </div>
      </section>

      <section id="pillars" className="ax-section ax-section-alt" aria-label="Research journey">
        <div className="ax-container">
          <div className="ax-section-head">
            <p className="ax-eyebrow">One connected research journey</p>
            <h2>Five pillars. One research nexus.</h2>
          </div>
          <ol className="ax-pillars">
            {pillars.map((p) => (
              <li key={p.label}><Icon name={p.icon} />{p.label}</li>
            ))}
          </ol>
        </div>
      </section>

      <section id="resources" className="ax-section">
        <div className="ax-container">
          <div className="ax-section-head">
            <p className="ax-eyebrow">Explore the platform</p>
            <h2>Research starts with curiosity.</h2>
            <p>Discover existing modules and request access to the resources relevant to your work.</p>
          </div>
          <div className="ax-grid">
            {areas.map((area) => (
              <Link key={area.title} href="/login" className="ax-card">
                <Icon name={area.icon} />
                <small>{area.category}</small>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <span className="ax-more">Explore ›</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ax-section ax-section-alt ax-cta">
        <div className="ax-container">
          <p className="ax-eyebrow">Join the research community</p>
          <h2 style={{ marginTop: ".6rem" }}>Turn ideas into impact.</h2>
          <p>Request research access. Access begins after administrator approval.</p>
          <Link href="/register" className="ax-btn ax-btn-primary ax-btn-lg">Request access</Link>
        </div>
      </section>

      <footer className="ax-footer">
        <div className="ax-container ax-footer-inner">
          <BrandLockup compact />
          <span>From Silicon to Intelligent Healthcare · <Link href="/contact" style={{ color: "var(--accent)" }}>Contact Us</Link></span>
        </div>
      </footer>
    </main>
  );
}