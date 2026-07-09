import React from "react";
import { Sidenav } from "rsuite";
import LinkedInIcon from "@material-ui/icons/LinkedIn";
import GithubIcon from "@material-ui/icons/GitHub";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";

import "../styles/SideBarNav.css";
import FadeInSection from "./FadeInSection";

const isMobile = window.innerWidth < 600;

class SideBarNav extends React.Component {
    constructor() {
        super();
        this.state = {
          expanded: true,
          activeKey: "1"
        };
        this.handleSelect = this.handleSelect.bind(this);
      }
      
      handleScroll = () => {
        const activeSection = this.getActiveSection();
        if (activeSection !== this.state.activeSection) {
            this.setState({ activeSection });
        }
      };
      
      componentDidMount() {
        window.addEventListener("scroll", this.handleScroll);
      };

      componentWillUnmount() {
        window.removeEventListener("scroll", this.handleScroll);
      };

      getActiveSection = () => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const sectionPositions = {
          intro: document.getElementById("intro").offsetTop,
          about: document.getElementById("about").offsetTop,
          experience: document.getElementById("experience").offsetTop,
          projects: document.getElementById("projects").offsetTop,
          // Add more sections as needed
        };
      
        let activeSection = "intro";
        for (const section in sectionPositions) {
          const sectionPosition = sectionPositions[section];
          const sectionHeight = document.getElementById(section).offsetHeight;
      
          if (
            scrollY >= sectionPosition - windowHeight / 2 && // Adjusted this line
            scrollY < sectionPosition + sectionHeight - windowHeight / 2 // Adjusted this line
          ) {
            activeSection = section;
          }
        }
        return activeSection;
      };
      
      handleSelect(eventKey) {
        this.setState({
          activeKey: eventKey
        });
      };
      render () {
        const { expanded, activeSection } = this.state;

        const links = [
            { id: "intro", text: "home" },
            { id: "about", text: "about" },
            { id: "experience", text: "experience" },
            { id: "projects", text: "projects" }
        ];

        return (
            <div className="sidebar-nav">
                {!isMobile && (
                    <Sidenav
                        expanded = {expanded}
                        defaultOpenKeys={["3", "4"]}
                        activeKey={this.state.activeKey}
                        onSelect={this.handleSelect}
                        appearance={"subtle"}
                    >
                        <Sidenav.Body>
                            <div className="sidebar-links">
                                {links.map((link, i) => (
                                    <FadeInSection>
                                        <a
                                            href={`#${link.id}`}
                                            className={activeSection === link.id ? "active-link" : ""}
                                        >
                                            {link.text}
                                        </a>
                                    </FadeInSection>
                                ))}
                            </div>
                        </Sidenav.Body>
                    </Sidenav>
                )}
                <div className="sidebar-logos" href="/">
                    <a href="https://www.linkedin.com/in/chenghanchan/">
                        <LinkedInIcon style={{ fontSize: 22.5 }}></LinkedInIcon>
                    </a>
                    <a href="https://github.com/Johnsonchan105">
                        <GithubIcon style={{ fontSize: 20 }}></GithubIcon>
                    </a>
                    <a href="https://www.instagram.com/johnsonchan105/">
                        <InstagramIcon style={{ fontSize: 22.5 }}></InstagramIcon>
                    </a>
                    <a href="https://www.facebook.com/johnsonchan105/">
                        <FacebookIcon style={{ fontSize: 22.5 }}></FacebookIcon>
                    </a>
                </div>
            </div>
        );
      }
}

export default SideBarNav;