import { aboutData } from '../data/portfolioData';

export default function About() {
  return (
    <section className="about" id="about">
      <div className="about-info">
        <h2 className="heading">About <span>Me</span></h2>
        <h3>{aboutData.role}</h3>
        <p>
          {aboutData.description}
        </p>
        <a href="#" className="btn">Read More</a>
      </div>
    </section>
  );
}
