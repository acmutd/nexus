import { Link, useNavigate } from 'react-router-dom';
import { delay, motion } from 'framer-motion';
import { useMobile } from '../context/mobileContext';
import StarFieldOverlay from '../components/StarFieldOverlay';

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

  const floatVariants = {
      float: (custom) => ({
          y: [0, custom.y, 0],
          x: [0, custom.x, 0],
          rotate: [custom.startRotate, custom.endRotate, custom.startRotate],
          transition: {
              duration: custom.duration,
              repeat: Infinity,
              ease: "easeInOut",
          }
      })
  };

  const objects = [
      {
          name: 'laptop',
          path: '/assets/HomePageAssets/Laptop.svg',
          style: {
              position: 'fixed',
              top: '15%',
              left: '3%',
              width: '240px',
          },
          custom: { x: 10, y: -6, startRotate: -2, endRotate: 6, duration: 6.2 }
      },
      {
          name: 'chair',
          path: '/assets/HomePageAssets/Chair.svg',
          style: {
              position: 'fixed',
              top: '15%',
              right: '2%',
              width: '240px',
          },
          custom: { x: -7, y: -8, startRotate: -2, endRotate: -9, duration: 5.1 }
      },
      {
          name: 'coffee',
          path: '/assets/HomePageAssets/Coffee.svg',
          style: {
              position: 'fixed',
              top: '45%',
              left: '3%',
              width: '200px',
          },
          custom: { x: 9, y: -7, startRotate: 1, endRotate: 7, duration: 4.8 }
      },
      {
          name: 'books',
          path: '/assets/HomePageAssets/Books.svg',
          style: {
              position: 'fixed',
              bottom: '3%',
              right: '2%',
              width: '200px',
          },
          custom: { x: -6, y: -5, startRotate: -1, endRotate: -5, duration: 6.7 }
      },
      {
          name: 'pigy',
          path: '/assets/HomePageAssets/Pigy.svg',
          style: {
              position: 'fixed',
              bottom: '23%',
              right: '3%',
              width: '220px',
          },
          custom: { x: 11, y: -6, startRotate: 1, endRotate: 8, duration: 5.3 }
      },
      {
          name: 'peechi',
          path: '/assets/HomePageAssets/Peechi.svg',
          style: {
              position: 'fixed',
              bottom: '2%',
              left: '5%',
              width: '140px',
          },
          custom: { x: 7, y: -6, startRotate: -3, endRotate: 3, duration: 7.1 }
      }
  ];

  return (
    <>
      <div className={`inset-0 min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center fixed overflow-hidden z-0`} 
          style={{ backgroundImage: "url('assets/BasicBG.svg')"}}/>
           <StarFieldOverlay count={isMobile ? 100 : 200} />

      {/* Floating objects */}
      {objects.map((obj) => (
        !isMobile &&
          <motion.div
              key={obj.name}
              style={obj.style}
              variants={floatVariants}
              animate="float"
              custom={obj.custom}
              className='will-change-transform pointer-events-none'
          >
              <img 
                  src={obj.path} 
                  alt={obj.name} 
                  style={{ width: '100%', height: 'auto' }}
              />
          </motion.div>
      ))}

      {/* -------------------------------------- CONTENT -------------------------------------------*/}
        <div className='relative flex items-center justify-center w-full min-h-screen overflow-hidden'>
        <motion.div className="flex flex-col w-full h-full items-center justify-center mt-30 z-1" initial={{opacity:0, y:20}} animate={{opacity: 1, y:0}} transition={{duration: 0.7, delay: 0.2}}>

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
      {/* ---------------- FEEDBACK BUBBLE ---------------- */}
    <a
      href="https://docs.google.com/forms/d/e/1FAIpQLSfA5sNwJUlHn3QroikwHuDGhOve6qjb7ssMjkvLd-RGK_PLaQ/viewform"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="relative bg-nexus800 text-white px-5 py-3 rounded-full shadow-lg
                  flex items-center gap-2 cursor-pointer
                  hover:scale-105 hover:bg-nexus700 transition"
      >
        <span className="tinyText font-titilliumWeb-semibold whitespace-nowrap">
          Fill out feedback form
        </span>

        {/*hover tip*/}
        <span
          className="absolute bottom-full right-0 mb-3 w-72 p-3 rounded-lg
                    bg-nexus900 text-white text-xs leading-snug
                    opacity-0 translate-y-2 pointer-events-none
                    transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-y-0"
        >
          Run into any issues, potential improvements, or want to tell us what you like about Nexus,
          let us know by filling out this form.
          <br />
          <br />
          We appreciate any and all input :)
        </span>
      </motion.div>
    </a>

    </>
  );
};

export default Home;
