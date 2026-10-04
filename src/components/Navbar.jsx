import { navLinks } from '../data/portfolioData';

export default function Navbar({ activeSection }) {
  return (
    <nav className="navbar">
      <a href="#" className="logo">Portfolio.</a>
      <ul>
        {navLinks.map((link) => (
          <li key={link.id} className={activeSection === link.id ? "active" : ""}>
            <a href={`#${link.id}`}>{link.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
