import React from 'react';
import PropTypes from "prop-types";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box'
import FadeInSection from './FadeInSection';
import { CSSTransition } from 'react-transition-group';
function TabPanel(props) {
    const {children, value, index, ...other}  = props;

    return (
        <div
        role = "tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`
    }
}

const ExperienceList = () => {
    const [value, setValue] = React.useState(0);
    

    const experienceItems = {
        "Robinhood": {
            "Software Engineer @" : {
                duration: "12/25 - 06/26",
                desc: [
                    "Architected end-to-end filtering across brokerage and account-management types, enabling marketing to target 10+ distinct account segments and lifting campaign conversion.",
                    "Shipped high-impact launches across crypto, giveaways, and Super Boost, contributing to growth that reached 4.3M Robinhood Gold subscribers.",
                    "Built a Kafka-based distribution pipeline using consumers and event publishing, successfully distributing crypto coins to over 1M users across 3 promotion timelines.",
                    "Engineered Airflow DAGs and a new feature store for the Super Boost promotion, aggregating values across multiple APIs and data stores to compute new derived features."
                ]
            }
        },
        "Applied Materials": {
            "Software Engineer @" : {
                duration: "07/24 - 12/25",
                desc: [
                    "Optimized ClickHouse database performance using SQL and PyArrow, reducing query execution times by 98% through efficient data processing and indexing strategies.",
                    "Implemented and enhanced efficient REST APIs for UI needs, reducing page load times by 40% through streamlined endpoints.",
                    "Engineered comprehensive tests for APIs and data transformers, boosting test coverage from 60% to 85% and enhancing system reliability.",
                    "Spearheaded development of a dynamic data batch loader, reducing memory usage by 47% and increasing batch throughput from 10k to 25k records per second."
                ]
            }
        },
        "Channel Islands National Marine Sanctuary": {
            "Web Development and Data Visualization Intern @" : {
                duration: "09/23 - 06/24",
                desc: [
                    "Developed a customized WordPress content management system using object oriented PHP, reducing content update times by 25%.",
                    "Leveraged WordPress and custom JavaScript to build a data visualization platform for National Marine Sanctuaries, displaying vital data encompassing over 663,000 square miles of protected aquatic habitats."
                ]
            }
        },
        "Y STEM and Chess": {
            "Jr. Software Engineering Intern @" : {
                duration: "07/23 - 09/23",
                desc: [
                    "Built new frontend features for a web application using Angular 9, resulting in a 20% increase in user engagement and a 15% decrease in page load time.",
                    "Improved backend functionalities by implementing additional endpoints using NodeJS Express and MongoDB, resulting in a 30% increase in data processing speed."
                ]
            }
        },
        "Bionic Visions Lab" : {
            "Undergraduate Research Assistant @" : {
                duration: "09/22 - 06/23",
                desc: [
                    "Deployed a content management system with an authorization and verification system, increasing efficiency and accuracy of website updates by 40%.",
                    "Incorporated a consistent design strategy to provide low-vision users with a more accessible website experience."
                ]
            }
        }
    }

    const handleChange = (event, newValue) => {
        setValue(newValue);
    }

    return (
        <div id = "experience-container">
            <Tabs
                value = {value}
                onChange={handleChange}
                variant={"standard"}
            >
                {Object.keys(experienceItems).map((key, i) => (
                    <Tab label={key} {...a11yProps(i)} />
                ))}
            </Tabs>
            {Object.keys(experienceItems).map((key, i) => (
                Object.keys(experienceItems[key]).map((role, j) => (
                    <FadeInSection>
                    <CSSTransition
                        in={value === i}
                        timeout={300}
                        classNames="tab-content"
                        unmountOnExit
                    >
                            <TabPanel value={value} index={i}>
                                <span className="joblist-job-title">
                                    {role + " "}
                                </span>
                                <span className="joblist-job-company">
                                    {key}
                                </span>
                                <div className="joblist-duration">
                                    {experienceItems[key][role]["duration"]}
                                </div>
                                <ul className="job-description">
                                    {experienceItems[key][role]["desc"].map(function (descItem, k) {
                                        return (
                                            <li key={k}>{descItem}</li>
                                        );
                                    })}
                                </ul>
                            </TabPanel>
                    </CSSTransition>
                    </FadeInSection>
                ))
            ))}
        </div>
    );
}

export default ExperienceList