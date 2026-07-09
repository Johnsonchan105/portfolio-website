import React, { useEffect } from 'react';
import Intro from './components/Intro.js'
import About from './components/About.js'
import Experience from './components/Experience.js'
import Projects from './components/Projects.js'
import Footer from './components/Footer.js'
import SideBarNav from './components/SideBarNav.js';
import './App.css';
import "./styles/Global.css";
import ReactGA from "react-ga4";
ReactGA.initialize("G-5VBPVSS9CD");
ReactGA.send("pageview");

function App() {
  useEffect(() => {
    ReactGA.send("pageview");
  }, []);
  return (
    <div className='App'>
      <div id='content'>
        <Intro></Intro>
        <About></About>
        <Experience></Experience>
        <Projects></Projects>
        <Footer></Footer>
      </div>
      <SideBarNav/>
    </div>
  );
}

export default App;
