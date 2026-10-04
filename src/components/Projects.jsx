import { projectsData } from '../data/portfolioData';

export default function Projects() {
  return (
    <section className="projects" id="projects">
      <div className="projects-header">
        <h2 className="heading">My <span>Projects</span></h2>
        <p>Here are some of the works I’ve built recently.</p>
      </div>

      <div className="projects-container">
        {projectsData.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-img">
              <img src={project.image} alt={`${project.title} screenshot`} />
            </div>
            <div className="project-info">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <a href={project.link} className="btn" target="_blank" rel="noreferrer">
                View Project
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
