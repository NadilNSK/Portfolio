import { skillsData } from '../data/portfolioData';

export default function Skills() {
  return (
    <section className="skills-grid" id="skills-grid">
      <h2 className="heading">My <span>Skills</span></h2>

      <div className="skills-icons">
        {skillsData.map((skill, idx) => (
          <div key={idx} className="skill-card">
            <img 
              src={`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.icon}`} 
              alt={`${skill.name} icon`} 
            />
            <p>{skill.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
