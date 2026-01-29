import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMobile } from '../context/mobileContext';

const acmWebsites = [
  { name: 'UTD Grades', link: 'https://www.utdgrades.com', icon: "/assets/UTDGradesIcon.svg", description: "Make smarter choices by seeing how students did in any given class." },
  { name: 'Sage', link: 'https://utdsage.com', icon: "/assets/SageIcon.svg", description: "Get personalized advice on your degree plan, at any time." },
  { name: 'ACM UTD Discord', link: 'https://discord.gg/ttB9HuaKsA', icon: "/assets/ACMIcon.svg", description: "Get involved with the Association of Computing Machinery at UTD." },
];

const Home = () => {
  const navigate = useNavigate()
  const {isMobile} = useMobile()
  const {isScreenMedium} = useMobile()

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
    <>
      <div className={`inset-0 min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center fixed overflow-hidden`} 
          style={{ backgroundImage: "url('/assets/HomeBG.svg')"}}/>
      
      {/* -------------------------------------- CONTENT -------------------------------------------*/}
        <div className='relative flex items-center justify-center w-full min-h-screen'>
        <motion.div className="flex flex-col w-full h-full items-center justify-center mt-30 z-1" initial={{opacity:0, y:20}} animate={{opacity: 1, y:0}} transition={{duration: 0.7}}>

          <div className="min-w-75 bg-linear-to-b from-nexus800 via-nexus900 to-nexus800 px-10 py-6 w-[60%] flex flex-col items-center justify-center overflow-y-auto rounded-lg ">
            <h2 className="text-white headingText font-titilliumWeb-semibold mb-6 w-full text-center">
              Welcome back to Nexus! Where do you wanna go?
            </h2>

            {/* ----------------------- BUTTONS --------------------------------*/}
            <div className={`${isScreenMedium ? 'grid grid-cols-2' : 'flex flex-wrap'} w-full justify-between gap-12 mb-10`}>
              {['Discord', 'Superdoc', 'GradeCalc', 'Settings'].map((name) => (
                <div key={name} className="flex flex-col items-center">
                  <div
                    className={`rounded-xl p-6 hover:scale-103 transition cursor-pointer bg-cover bg-center`}
                    style={{ backgroundImage: `url('/assets/${name}Button.svg')`, width: "clamp(115px, 10vw, 200px)", height: "clamp(115px, 10vw, 200px)"} }
                    onClick={() => handleButtonClick(name)}
                  />
                  <span className="text-white tinyText font-titilliumWeb-semibold mt-2 text-center whitespace-nowrap">
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

            {/* acm shilling */}
            <div className="flex w-full h-full text-white relative border-t-1 border-nexus700 pt-4">
              {/* -------------------- CONTENT ------------------------ */}
              <div className="flex flex-wrap w-full h-fit m-2">
                <h1 className="flex w-full bodyText font-titilliumWeb-semibold items-center justify-center text-center mb-1">Interested in More Like Nexus?</h1>
                <h1 className="flex w-full tinyText text-gray-400 font-titilliumWeb-semibold mb-4 items-center justify-center text-center">Nexus is just one of ACM's projects, you can check out more of them below!</h1>
                <div className={`flex-row ${isMobile ? 'flex flex-wrap' : isScreenMedium ? 'grid grid-cols-2' : 'grid grid-cols-3'} w-full h-full gap-8 text-center font-titilliumWeb-semibold tinyText`}>
                  {acmWebsites.map((website, webIndex) => (
                    <a className='flex flex-row tinyText w-full rounded-lg gap-2 cursor-pointer' href={website.link} target='_blank' rel="noopener noreferrer" >
                      <img src={website.icon} className='w-24 h-24 flex  hover:scale-105 transition duration-300'/>
                      <div className='flex flex-col text-start justify-start mt-2 w-auto'>
                        <h1 className='underlineText flex'>
                          {website.name}
                        </h1>
                        <span className='text-xs text-gray-400'>
                          {website.description}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

          </div>
          <div className='bg-nexus800 rounded-full flex px-4 items-center gap-2 justify-center font-titilliumWeb-semibold p-1 mt-2 text-nexus100 mt-8 mb-4'>
            <img src='/assets/Logo.svg' className='w-7 h-7'/>
            Powered by ACM Dev
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Home;
