import React from "react";
import "../styles/Project.css";
import FadeInSection from "./FadeInSection";

const projects = [
    {
        title: "AI Job-Search Agent",
        duration: "2026 - PRESENT",
        desc: [
            "Built a Python pipeline that pulls postings from company ATS boards (Greenhouse, Lever, Ashby, Workday) plus Gmail job-alert emails, dedupes them, and fit-scores each one against my resume.",
            "Wrote a tailoring step that rewrites resume bullets per job description and renders a clean, honest PDF with no hidden or keyword-stuffed text.",
            "Automated application autofill with Playwright over the Chrome DevTools Protocol, resolving leftover fields with a targeted LLM pass and stopping at a review queue for a manual final submit.",
            "Deployed the stack with Docker on a home server to run a daily autonomous collection and scoring loop."
        ],
        tags: ["Python", "Playwright", "Docker", "LLM APIs"]
    },
    {
        title: "Marine Sanctuary Data Visualization Platform",
        duration: "09/23 - 06/24",
        desc: [
            "Built a custom WordPress content management system in object oriented PHP for the Channel Islands National Marine Sanctuary.",
            "Built a JavaScript data visualization layer on top of it to map conservation data across more than 663,000 square miles of protected ocean habitat."
        ],
        tags: ["PHP", "WordPress", "JavaScript", "Data Viz"]
    },
    {
        title: "Accessible Research Portal",
        duration: "09/22 - 06/23",
        desc: [
            "Built a content management system with a full authorization and verification flow for a UCSB vision-science research lab.",
            "Designed the site around a consistent, high-contrast layout to make it more accessible for low-vision users."
        ],
        tags: ["Web Accessibility", "Auth", "CMS"]
    }
];

const Projects = () => {
    return (
        <div id="projects">
            <FadeInSection>
                <div className="section-header">
                    <span className="section-title">Projects</span>
                </div>
                <div id="projects-container">
                    {projects.map((project, i) => (
                        <FadeInSection key={i}>
                            <div className="project-card">
                                <div className="project-header">
                                    <span className="project-title">{project.title}</span>
                                    <span className="project-duration">{project.duration}</span>
                                </div>
                                <ul className="project-description">
                                    {project.desc.map((descItem, j) => (
                                        <li key={j}>{descItem}</li>
                                    ))}
                                </ul>
                                <div className="project-tags">
                                    {project.tags.map((tag, k) => (
                                        <span className="project-tag" key={k}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </FadeInSection>
                    ))}
                </div>
            </FadeInSection>
        </div>
    );
};

export default Projects;
