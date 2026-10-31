import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Education from './components/Education';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Contact from './components/Contact';
import CircuitBackground from './components/CircuitBackground';
import { requestEffectFrame, cancelEffectFrame } from './animations/effectFrames.js';
import './index.css';

function App() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const sections = [...document.querySelectorAll('section')];
    const navbar = document.querySelector('.navbar');
    let headerHeight = navbar?.offsetHeight || 80;
    const update = () => {
      const marker = window.scrollY + headerHeight + 32;
      let current = sections[0]?.id || 'home';
      for (const section of sections) {
        if (section.offsetTop <= marker) current = section.id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1]?.id || current;
      }
      setActiveSection(current);
    };
    const queue = () => requestEffectFrame(update);
    const resized = () => { headerHeight = navbar?.offsetHeight || 80; queue(); };
    const observer = new ResizeObserver(resized);
    sections.forEach(section => observer.observe(section));
    if (navbar) observer.observe(navbar);
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', resized, { passive: true });
    update();
    return () => {
      cancelEffectFrame(update);
      observer.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', resized);
    };
  }, []);

  useEffect(() => {
    const sections = [...document.querySelectorAll('section:not(.home)')];
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    const reveal = () => {
      observer?.disconnect();
      if (preference.matches || !('IntersectionObserver' in window)) {
        sections.forEach(section => section.classList.add('show'));
        return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
      sections.forEach(section => {
        if (!section.classList.contains('show')) {
          section.classList.add('reveal-section');
          observer.observe(section);
        }
      });
    };
    reveal();
    preference.addEventListener('change', reveal);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', reveal);
    };
  }, []);

  return (
    <>
      <CircuitBackground />
      <Navbar activeSection={activeSection} />
      <Hero />
      <About />
      <Education />
      <Projects />
      <Skills />
      <Contact />
    </>
  );
}

export default App;
