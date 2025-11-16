const navItems = [
  { label: "Home", href: "#home" },
  { label: "Analyze Audio", href: "#analyze" },
  { label: "Insights", href: "#insights" },
  { label: "Modify Audio", href: "#modify" },
  { label: "About", href: "#about" }
];

const waveformHeights = [
  46, 72, 58, 90, 64, 88, 54, 76, 62, 98, 68, 84, 56, 74, 60, 86, 52, 70, 50,
  80, 48, 92, 66, 82, 58, 78, 62, 88, 60, 96, 68, 84, 54, 74, 58, 90, 64, 82,
  56, 78, 60, 86
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="floating-header">
        <div className="header-inner">
          <span className="brand">AudioSense</span>
          <nav className="nav-links">
            {navItems.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="ghost-link" href="#analyze">
            Try Demo
          </a>
        </div>
      </header>
      <main>
        <section id="home" className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Premium Audio Intelligence</span>
            <h1>Intelligent Audio Analysis &amp; Enhancement</h1>
            <p>
              Upload audio, understand its structure, and enhance it with
              AI-powered controls. Navigate clarity, dynamics, and texture
              through an elegant, data-rich experience.
            </p>
            <div className="hero-actions">
              <a className="primary-btn" href="#analyze">
                Upload Audio
              </a>
              <a className="secondary-btn" href="#insights">
                Try Demo
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="wave-center">
              <div className="wave pulse" />
              <div className="wave ripple" />
              <div className="wave outline" />
            </div>
            <div className="waveform-bars">
              {waveformHeights.map((height, index) => (
                <span
                  key={index}
                  style={{
                    animationDelay: `${index * 0.07}s`,
                    height: `${height}px`
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="analyze" className="analyze-section">
          <div className="section-heading">
            <h2>Upload &amp; Analyze</h2>
            <p>
              Drag in a stem, full mix, or field recording. AudioSense parses
              spectral energy, detects transients, and recommends intelligent
              enhancements in seconds.
            </p>
          </div>
          <div className="analysis-panel">
            <div className="drop-card">
              <div className="drop-glow" aria-hidden="true" />
              <div className="drop-content">
                <p className="drop-title">Drag &amp; Drop Audio</p>
                <p className="drop-subtitle">or</p>
                <button type="button" className="browse-btn">
                  Browse Files
                </button>
                <div className="supported">
                  <span>Supports</span>
                  <div className="badges">
                    <span>.mp3</span>
                    <span>.wav</span>
                    <span>.aiff</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="insight-card">
              <h3>Smart Analysis Preview</h3>
              <p>
                AudioSense prepares an interactive profile with clarity
                metrics, spectral tilt, stereo imaging, and headroom targets.
              </p>
              <ul>
                <li>Spectral contour mapping &amp; harmonic balance</li>
                <li>Transient density &amp; rhythmic consistency</li>
                <li>Noise floor prediction with intelligent gating</li>
              </ul>
              <button type="button" className="analyze-btn">
                Analyze Audio
              </button>
            </div>
          </div>
        </section>

        <section id="insights" className="insights-section">
          <div className="section-heading compact">
            <h2>Insights You Can Trust</h2>
            <p>
              Deep visuals translate complex audio data into calm,
              comprehension. Every metric is surfaced into focused tiles with
              contextual recommendations.
            </p>
          </div>
          <div className="insight-grid">
            <article>
              <h3>Clarity Index</h3>
              <p>
                Pinpoint frequency congestion and receive guided EQ moves for
                surgical cleanup without guesswork.
              </p>
            </article>
            <article>
              <h3>Spatial Field</h3>
              <p>
                Visualize stereo energy distribution and unlock immersive width
                while preserving mono compatibility.
              </p>
            </article>
            <article>
              <h3>Dynamic Sculptor</h3>
              <p>
                Diagnose compression ratios, transient headroom, and loudness
                trends with precision recommendations.
              </p>
            </article>
          </div>
        </section>

        <section id="modify" className="modify-section">
          <div className="section-heading compact">
            <h2>Modify With Intention</h2>
            <p>
              Glide through curated enhancement controls that respond to the
              track&apos;s fingerprint for smart, musical results.
            </p>
          </div>
          <div className="modify-panels">
            <div className="glass-tile">
              <span className="tile-label">Adaptive EQ</span>
              <h3>Sculpt frequencies intuitively</h3>
              <p>
                AI-assisted bell and shelf moves that adapt live as you sweep,
                preserving tonal integrity.
              </p>
            </div>
            <div className="glass-tile">
              <span className="tile-label">Texture Engine</span>
              <h3>Enhance depth &amp; warmth</h3>
              <p>
                Blend harmonic saturation, tape warmth, and subtle modulation
                tailored to your source material.
              </p>
            </div>
            <div className="glass-tile">
              <span className="tile-label">Smart Master</span>
              <h3>Deliver polished masters</h3>
              <p>
                Automatic loudness normalization with export presets for
                streaming, broadcast, and immersive formats.
              </p>
            </div>
          </div>
        </section>

      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} AudioSense Labs</span>
        <span>Crafted for premium audio intelligence.</span>
      </footer>
    </div>
  );
}
