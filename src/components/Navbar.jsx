import { useEffect, useRef, useState } from 'react';
import { navLinks } from '../data/portfolioData';

export default function Navbar({ activeSection }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches);
  const navRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const resize = () => { setCompact(media.matches); setMenuOpen(false); };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = event => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  return (
    <nav ref={navRef} className="navbar" aria-label="Main navigation">
      <a href="#home" className="logo" onClick={() => setMenuOpen(false)}>Portfolio.</a>
      <button
        ref={toggleRef}
        className="nav-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        onClick={() => setMenuOpen(open => !open)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <ul id="primary-navigation" className={`nav-links${menuOpen ? ' is-open' : ''}`} inert={compact && !menuOpen}>
        {navLinks.map(link => (
          <li key={link.id} className={activeSection === link.id ? 'active' : ''}>
            <a href={`#${link.id}`} aria-current={activeSection === link.id ? 'location' : undefined} onClick={() => setMenuOpen(false)}>
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
