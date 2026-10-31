import { heroData } from '../data/portfolioData';
import InteractivePortrait from './InteractivePortrait';

export default function Hero() {
  return (
    <>
      <div className="bars-animation">
        {[6, 5, 4, 3, 2, 1].map((i) => (
          <div key={i} className="bar" style={{ "--i": i }}></div>
        ))}
      </div>

      <section className="home" id="home">
        <div className="home-info">
          <h1>{heroData.name}</h1>
          <h2 aria-label={`I'm a ${heroData.roles[0].text.trim()}`}>
            I'm a{' '}
            <span className="hero-roles" aria-hidden="true">
              {heroData.roles.map((role, idx) => (
                <span className="hero-role" key={idx} style={{ "--i": role.i }} data-text={role.text.trim()}>
                  {role.text.trim()}
                </span>
              ))}
            </span>
          </h2>
          <p>{heroData.description}</p>
          <div className="btn-sci">
            <a href="#" className="btn">Download CV</a>
            <div className="sci">
              {heroData.socials.map((social, idx) => (
                <a key={idx} href={social.link} aria-label={social.icon.replace('bx bxl-', '')}>
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="home-img">
          <InteractivePortrait alt={`Profile of ${heroData.name}`} />
        </div>
      </section>
    </>
  );
}
