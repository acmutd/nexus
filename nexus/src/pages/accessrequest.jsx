import React from 'react'
import { Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

function AccessRequest() {
  const isMed = useMediaQuery({ query: '(max-width: 1223px)' })

  return (
    <div>
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 flex flex-col items-center justify-center h-full pt-20">
        {isMed ? (
          <img
            className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center"
            src="/assets/AccessRequestLongBG.svg"
            style={{ position: 'absolute', zIndex: 0 }}
          />
        ) : (
          <img
            className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center"
            src="/assets/AccessRequestBG.svg"
            style={{ position: 'absolute', zIndex: 0 }}
          />
        )}
        {/* --------------------------------- HEADER --------------------------------- */}
        <h1 className="font-titilliumWeb-bold text-white text-4xl" style={{ zIndex: 1 }}>
          Before We Begin:
        </h1>
        {/* --------------------------------- DISCLAIMER BOX --------------------------------- */}
        <div className="flex-1 w-2/5 h-4/5 bg-gradient-to-b from-nexus100 from-10% to-white to-90% rounded-xl mt-6 p-6" style={{ zIndex: 2 }}>
          <div className="items-center justify-center flex flex-row">
            <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
            <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
          </div>
          <div className="items-center justify-center flex flex-col" style={{ marginTop: isMed ? -8 : 0, scale: isMed ? .8 : 1 }}>
            <h1 className="font-titilliumWeb-bold text-nexus800 text-5xl">
              Nexus
            </h1>
            <h2 className="font-titilliumWeb-regular text-center text-3xl">
              Would like to access your UTD data
            </h2>
          </div>
          {/* --------------------------------- INNER BOX --------------------------------- */}
          <div className="flex flex-col bg-nexus50 rounded-xl items-center text-center justify-center" style={{ marginTop: isMed ? -8 : 16 }}>
            <h1 className="font-titilliumWeb-semibold text-nexus800 text-3xl pt-4" style={{ fontSize: isMed ? 25 : 30 }}>
              This allows Nexus to:
            </h1>
            <h2 className="w-4/5 font-titilliumWeb-regular text-nexus800 text-2xl items-center justify-center text-center"
              style={{ fontSize: isMed ? 18 : 24 }}>
              Scrape data from your classes in order to partition your classes/role into discord servers.
            </h2>
            <h3 className="w-4/5 font-titilliumWeb-bold text-nexus800 text-2xl items-center justify-center text-center mt-6 mb-4"
              style={{ fontSize: isMed ? 18 : 24 }}>
              If you want to skip, all you’ll have to do is manually enter in your courses.
            </h3>
          </div>
          {/* --------------------------------- BUTTONS --------------------------------- */}
          <div className="flex flex-row justify-between items-center">
            <Link to="/courseEntry" className="text-white bg-gray-500 py-3 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                          transition duration-300 hover:scale-105 drop-shadow-black items-center justify-center"
              style={{ width: isMed ? '45%' : '33.3333%' }}>
              Skip
            </Link>
            <Link to="/LoginWithNetID" className="text-white bg-nexus500 py-3 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                        transition duration-300 hover:scale-105 drop-shadow-black items-center justify-center"
              style={{ width: isMed ? '45%' : '33.3333%' }}>
              Continue
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessRequest;
