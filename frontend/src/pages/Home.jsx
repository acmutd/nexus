import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMobile } from '../context/mobileContext';

const acmWebsites = [
  { name: 'UTD Grades', link: 'https://www.utdgrades.com', icon: "/assets/UTDGradesIcon.svg" },
  { name: 'Sage', link: 'https://utdsage.com', icon: "/assets/SageIcon.svg" },
  { name: 'ACM UTD', link: 'https://acmutd.co', icon: "/assets/ACMIcon.svg" },
];

const Home = () => {
  const navigate = useNavigate()
  const {isMobile} = useMobile()
  
  function handleButtonClick(name) {
    switch(name) {
      case "Discord": 
        navigate('/discordservers')
        break;
      case "Superdoc":
        navigate("/underconstruction")
        break;
      case "GradeCalc":
        navigate("/grade-calculator")
        break;
      case "Settings":
        navigate("/settings")
        break;
    }
  }

  return (
    <div className="flex w-full h-full bg-nexus900">
      {/* -------------------------------------- BACKGROUND -------------------------------------------*/}
      <div className="flex h-full w-full bg-no-repeat bg-center bg-cover fixed z-0" style={{ backgroundImage: "url('/assets/HomeBG.svg')"}}/>
      
      {/* -------------------------------------- CONTENT -------------------------------------------*/}
      <motion.div className="flex flex-col w-full h-full items-center justify-center mt-35 mb-15 z-1" initial={{opacity:0, y:20}} animate={{opacity: 1, y:0}} transition={{duration: 0.7}}>

        <div className="min-w-[300px] bg-gradient-to-b from-nexus800 via-nexus900 to-nexus800 p-12 w-3/5 max-w-5xl flex flex-col items-center overflow-y-auto rounded-lg ">
          <h2 className="text-white headingText font-titilliumWeb-semibold mb-6 w-full text-center">
            Welcome Back! What Do You Want To Do Today?
          </h2>

          {/* ----------------------- BUTTONS --------------------------------*/}
          <div className={`${window.innerWidth < 1100 ? 'grid grid-cols-2' : 'flex flex-wrap'} justify-center gap-12 mb-10`}>
            {['Discord', 'Superdoc', 'GradeCalc', 'Settings'].map((name) => (
              <div key={name} className="flex flex-col items-center">
                <div
                  className={`rounded-xl p-6 hover:scale-110 transition cursor-pointer bg-cover bg-center`}
                  style={{ backgroundImage: `url('/assets/${name}Button.svg')`, width: "clamp(100px, 10vw, 150px)", height: "clamp(100px, 10vw, 150px)"} }
                  onClick={() => handleButtonClick(name)}
                />
                <span className="text-white text-sm font-semibold mt-2">
                  {name === 'Discord' ? 'Discord Servers' :  name === 'GradeCalc' ? 'Grade Calculator' : name}
                </span>
              </div>
            ))}
          </div>

          {/*{ Recent Activity}
          <div className="bg-nexus800 rounded-xl p-6 w-full text-white mb-4 relative">
            <h3 className="text-2xl font-titilliumWeb-semibold mb-1">Recent Activity</h3>
            <ul className="text-nexus300 text-lg space-y-1 font-titilliumWeb-regular ">
            </ul>
          </div>*/}

          {/*Grades */}
          <div className="flex bg-nexus800 rounded-xl p-6 w-full h-full text-white relative">
            {/* -------------------- CONTENT ------------------------ */}
            <div className="flex flex-wrap w-full h-fit justify-center items-center">
              <h3 className="flex w-full text-2xl font-titilliumWeb-semibold mb-4">Interested in More ACM?</h3>
              <div className="flex flex-row flex-wrap w-full h-full gap-8 text-center font-titilliumWeb-semibold tinyText">
                {acmWebsites.map((website, webIndex) => (
                  <a className='flex flex-col gap-2 hover:scale-105 cursor-pointer transition duration-300' href={website.link} target='_blank' rel="noopener noreferrer" >
                    <img src={website.icon} className='w-24 h-24 flex'/>
                    {website.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
