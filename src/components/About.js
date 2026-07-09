import React from "react";
import '../styles/About.css';
import FadeInSection from "./FadeInSection";

class About extends React.Component {
    constructor(){
        super();
        this.state = {
            expanded: true,
            activeKey: '1',
            currentIndex: 0,
        }
        this.handleSelect = this.handleSelect.bind(this);   
        this.updateImageIndex = this.updateImageIndex.bind(this);
        this.handleImageClick = this.handleImageClick.bind(this);
    }
    componentDidMount() {
        this.interval = setInterval(this.updateImageIndex, 3000);
    }
    componentWillUnmount() {
        clearInterval(this.interval);
    }
    updateImageIndex() {
        this.setState(prevState => ({
            currentIndex: (prevState.currentIndex + 1) % 5
        }));
    }

    handleImageClick() {
        this.updateImageIndex();
    }

    handleSelect(eventKey){
        this.setState({
            activeKey: eventKey
        });
    }
    render(){
        const one = (
            <p>
                Hi! My name is Cheng Han, but I go by Johnson!
                I graduated from <a href="https://www.ucsb.edu/about">UCSB</a> with a <b>Bachelor's of Science</b> in
                <b> Computer Science</b> in June 2024.
                Since then I've worked as a <b>Software Engineer</b> at <a href="https://www.appliedmaterials.com/">Applied Materials</a> and <a href="https://robinhood.com/">Robinhood</a>, and I build side projects in my free time, including an AI-driven job search agent that automates the whole job hunt end to end.
            </p>
        );
        const two = (
            <p>
                Outside of work you'll probably find me rock climbing, playing video games, or obsessing over my latest hyperfixation.
            </p>
        );

        const tech_stack = [
            'Python',
            'Java',
            'Go',
            'JavaScript',
            'React',
            'Node.js',
            'SQL',
            'Docker',
            'Kubernetes',
            'PyTorch',
            'Figma'
        ];

        return (
            <div id='about'>
                <FadeInSection>
                    <div className="section-header">
                        <span className="section-title">About Me</span>
                    </div>
                    <div className="about-content">
                        <div className="about-desc">
                            {[one]}
                            {"I have been working with these technologies:"}
                            <ul className="tech-stack">
                                {tech_stack.map(function (tech_items, i){
                                    return (
                                        <FadeInSection>
                                            <li>{tech_items}</li>
                                        </FadeInSection>
                                    );
                                })}
                            </ul>
                            {[two]}
                        </div>
                        <FadeInSection>
                            <div className="about-me-img">
                                <div className="slideshow">
                                    <div className="slide" onClick={this.handleImageClick}>
                                        <img className="slide_img" src={`${process.env.PUBLIC_URL}/assets/carosel_pictures/carosel${this.state.currentIndex+1}.jpeg`} height={280} width={200} alt='profile pic'/>
                                    </div>
                                </div>
                            </div>
                        </FadeInSection>
                    </div>
                </FadeInSection>
            </div>
        )
    }
}

export default About;
