import React from 'react'
import { Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

function DiscordLogin() {
    const isMed = useMediaQuery({ query: '(max-width: 1223px'})
    
  return (
    <div>
        <div className="bg-gradient-to-b from-nexus900 to-nexus700 flex flex-col items-center justify-center h-full pt-60" style={{paddingTop: isMed ? 240 : 160}}>      
        {isMed ? (<img className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center" src={"/AccessRequestLongBG.svg"} 
             style={{position: 'absolute', zIndex: 0, }}/>) : 
                (<img className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center" src={"/AccessRequestBG.svg"} 
             style={{position: 'absolute', zIndex: 0, }}/>)}
        {/* --------------------------------- HEADER --------------------------------- */}
            <h1 className="flex-1 font-titilliumWeb-bold text-white text-4xl" style={{zIndex: 1}}>
                One Last Thing, We Promise!
            </h1> 
        {/* --------------------------------- DISCLAIMER BOX --------------------------------- */}
            <div className="flex-1 w-2/5 h-4/5 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl mt-6 p-6" style={{zIndex: 2}}>
                <div className="items-center justify-center flex flex-row">
                    <img src="/DiscordLogo.svg" style={{scale: isMed ? .6 : 1, margin: isMed ? -12 : 12}}/>
                </div>
                <div className="items-center justify-center flex flex-col" style={{marginTop: isMed ? -8 : 0, scale: isMed ? .8 : 1}}> 
                    <h1 className="w-4/5 text-center font-titilliumWeb-regular text-nexus800 text-5xl" 
                        style={{width: isMed ? '100%' : '80%', fontSize: isMed ? 36 : 48}}>
                        Now Let's Get Your Discord Setup!
                    </h1> 
                </div>
        {/* --------------------------------- BUTTON --------------------------------- */}
                <div className="flex flex-row justify-center items-center">
                    <Link to="/discordlogin" className="text-white bg-nexus500 py-3 text-2xl font-titilliumWeb-bold rounded-lg flex flex-row 
                        transition duration-300 hover:scale-105 drop-shadow-black text-center items-center justify-center"
                        style={{width: isMed ? '90%' : '80%', marginTop: isMed ? 0 : 24}}>
                        Login Through Discord
                    </Link>
                </div>
            </div>
        </div>
    </div>
  )
}

export default DiscordLogin