import React from "react";
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import '../styles/Intro.css';
import FadeInSection from "./FadeInSection";

class Intro extends React.Component {
    constructor(){
        super();
        this.state = {
            expanded: true,
            activeKey: '1'
        }
        this.handleSelect = this.handleSelect.bind(this);
    }

    handleSelect(eventKey){
        this.setState({
            activeKey: eventKey
        });
    }

    render() {
        return (
            <div id = 'intro'>
                <span className="intro-title">
                    {"Hi! I'm Johnson!"}
                </span>
                <FadeInSection>
                    <div className="intro-desc">
                    I'm a software engineer based in Campbell, CA, 
                    who loves crafting frontends, exploring machine learning, 
                    enhancing the way people interact with technology, 
                    and everything in between.
                    </div>
                    <a
                        href="mailto:chenghchan@gmail.com"
                        className="intro-button"
                    >
                        <EmailRoundedIcon></EmailRoundedIcon>
                        {" Contact Me!"}
                    </a>
                    <a
                        href="/resume.pdf"
                        className="intro-button"
                        target={"_blank"}
                        rel="noreferrer"
                    >
                        <DescriptionRoundedIcon></DescriptionRoundedIcon>
                        {" Resume"}
                    </a>
                </FadeInSection>
            </div>
        );
    }
}

export default Intro;

