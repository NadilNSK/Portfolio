import { heroData } from '../data/portfolioData';

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
          <h2>
            I'm a
            {heroData.roles.map((role, idx) => (
              <span key={idx} style={{ "--i": role.i }} data-text={role.text}>
                {role.text}
              </span>
            ))}
          </h2>
          <p>{heroData.description}</p>
          <div className="btn-sci">
            <a href="#" className="btn">Download CV</a>
            <div className="sci">
              {heroData.socials.map((social, idx) => (
                <a key={idx} href={social.link}>
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="home-img">
          <div className="img-box">
            <div className="img-item">
              <img src="/profile.png" alt={`Profile of ${heroData.name}`} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
