import React from 'react'
import { HiArrowNarrowRight } from 'react-icons/hi';
import { useMediaQuery } from 'react-responsive';
import { Link } from 'react-router-dom';

function LandingPage() {
  const isFull = useMediaQuery({ query: '(min-width: 1224px)' })
  const isMed = useMediaQuery({ query: '(max-width: 1223px)' })

  return (
    <div>
      <img
        className="w-full bg-blue-950"
        src={isMed ? "/assets/LandingPageLongBG.svg" : "/assets/LandingPageBG.svg"}
        style={{ position: 'absolute', zIndex: -1 }}
      />
      <div className="flex flex-col items-center justify-center min-h-full pt-30">
        {/* --------------------------------- HEADER --------------------------------- */}
        <h1 className="font-titilliumWeb-bold text-white text-5xl">
          Welcome to Nexus!
        </h1>
        <h2
          className="w-1/2 font-titilliumWeb-regular text-white text-2xl text-center pt-4"
          style={{ width: isMed ? 524 : 824 }}>
          The best place for connecting with classmates, enhancing collaboration, and boosting academic success.
        </h2>
        <Link to="/signup" className="text-white bg-nexus500 py-3 px-14 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                            transition duration-300 hover:scale-105 drop-shadow-black">
          Get Started
          <HiArrowNarrowRight className="pt-0.5" size={25} />
        </Link>
        {/* --------------------------------- CALCULATOR BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 8 : 48 }}>
          <img src="/assets/Person.svg" className="h-[250px] w-[225px] absolute -right-16 -top-32" />
          <div className="flex flex-row">
            <div className="pt-12 pl-12 pb-12">
              <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
                Smart Learning
              </h1>
              <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
                Stay on top of your grades and assignments and see the impact of a quiz or exam on your grade using the grade calculator.
              </h2>
            </div>
            <img src="/assets/Calculator.svg" className="w-2/5" />
          </div>
        </div>
        {/* --------------------------------- MEGAPHONE BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 0 : 48 }}>
          <img src="/assets/Megaphone.svg" className="w-2/5" />
          <div className="pt-12 pr-12 pb-12">
            <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
              Collaborative Environment
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
              Connect with peers and share knowledge effortlessly with our automated Discord server filtering for all your classes.
            </h2>
          </div>
        </div>
        {/* --------------------------------- NOTES BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 0 : 48 }}>
          <div className="pt-12 pl-12 pb-12">
            <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
              Resource Sharing
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
              Missed a lecture? Cramming for an exam? No biggie! Access and contribute to study materials alongside your classmates using Nexus’ Superdoc!
            </h2>
          </div>
          <img src="/assets/Book.svg" className="w-2/5" />
        </div>
      </div>
    </div>
  )
}

export default LandingPage;
