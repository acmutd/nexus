import React, { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive';
import Button from '../components/Button';
import { HiArrowRightStartOnRectangle, HiOutlineUsers  } from "react-icons/hi2";
import { motion } from 'framer-motion';

const ServerCard = ({title, link, banner, icon, description, members}) => {
  return (
    <div className="flex w-full bg-nexus900 relative rounded-xl pb-6">
      <div className="w-full h-[30%] relative bg-cover bg-center rounded-t-xl" style={{backgroundImage: banner}}>
        {/* Server Icon */}
        <div className="flex w-[75px] h-[75px] rounded-full bg-nexus900 ml-4 mt-8 items-center justify-center">
          <img className="flex w-[75%] h-[75%] rounded-full" src={icon}/>
        </div>
        {/* Server Details */}
        <div className="flex flex-col px-6">
          <h1 className='font-titilliumWeb-regular text-white text-lg'>
            {title}
          </h1>
          <h2 className='font-titilliumWeb-regular text-gray-400 text-sm'>
            {description}
          </h2>
          <div className='flex flex-row mt-3 mb-2 font-titilliumWeb-regular text-sm text-gray-400 items-center'>
            <HiOutlineUsers className="mr-1" color='white' size={15}/>
            <span>
              {members} {' '} Members
            </span>
          </div>
          <Button href={link} text={"Join Server"} icon={<HiArrowRightStartOnRectangle className="ml-2" color='white' size={20}/>}/>
        </div>
      </div>
    </div>
  )
}

function DiscordServers() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })

  const servers = [{title: "School of Engineering and Computer Science", link: "https://discord.gg/CknqAB2J5q", banner:"url('/assets/DiscordServerAssets/ECSBanner.png')", icon:"/assets/DiscordServerAssets/ECSIcon.png", description: 'Grind away on coding and engineering problems with your fellow classmates!', members: 225},
                   {title: "School of Economic, Political and Policy Sciences", link: "https://discord.gg/PRGbNG5Aus", banner:"url('/assets/DiscordServerAssets/EPSBanner.png')", icon:"/assets/DiscordServerAssets/EPSIcon.png", description: 'Discuss the socio-economic state of the world with other like-minded students!', members: 155},
                   {title: "School of Management", link: "https://discord.gg/RDwdNrGwse", banner:"url('/assets/DiscordServerAssets/MGTBanner.png')", icon:"/assets/DiscordServerAssets/MGTIcon.png", description: 'Network with prospective talented executives and business analysts right here!', members: 121},
                   {title: "School of Natural Sciences and Mathematics", link: "https://discord.gg/BxfHe9JGwc", banner:"url('/assets/DiscordServerAssets/NSMBanner.png')", icon:"/assets/DiscordServerAssets/NSMIcon.png", description: 'Chip away at complex formulas and equations with other mathematicians and scientists!', members: 167},
  ]

  const [liveCounts, setLiveCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState({});

  useEffect(() => {
    // For each server, extract invite code and request invite info from backend
    servers.forEach((s, idx) => {
      const code = s.link.split('/').pop();
      if (!code) return;

      setLoadingCounts(prev => ({ ...prev, [idx]: true }));

      fetch(`/api/discord/invite/${encodeURIComponent(code)}`)
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(data => {
          setLiveCounts(prev => ({ ...prev, [idx]: data.approximate_member_count }));
        })
        .catch(err => {
          console.warn('Failed to fetch invite data for', code, err);
        })
        .finally(() => setLoadingCounts(prev => ({ ...prev, [idx]: false })));
    });
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: isMed ? "url('/assets/CoursesLongBG.svg')" : "url('/assets/CoursesBG.svg')" }}>
    {/* ----------------------------------- MAIN CONTAINER ---------------------------------------- */}
        <motion.div className={`flex flex-col min-w-[300px] w-[70%] h-full items-center rounded-2xl my-30 bg-gradient-to-b from-nexus900 via-50% via-nexus800 to-90% to-nexus900 p-8`}
                    initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}}>
    {/* ----------------------------------- HEADING + SEARCH ---------------------------------------- */}
          <div className="flex flex-col w-full h-full py-2 rounded-xl">
            <h1 className="font-titilliumWeb-bold text-nexus50 text-4xl">
              Discord Servers
            </h1>
            <span className="font-titilliumWeb-regular text-gray-400 text-lg">
              Join all your school’s Discord community servers to connect with your fellow classmates, share resources, and collaborate!
            </span>
          </div>
    {/* ----------------------------------- COURSES ---------------------------------------- */}
          <div className="grid grid-cols-2 mt-4 gap-6 w-full h-full items-center justify-center overflow-hidden">
            {servers.map((item, index) => (
              <div className="flex w-full h-full">
                <ServerCard link={item.link} title={item.title} banner={item.banner} icon={item.icon} description={item.description} members={item.members} liveMembers={liveCounts[index]} loadingMembers={loadingCounts[index]}/>
              </div>
            ))}
          </div>
          <span className='font-titilliumWeb-regular text-gray-400 text-lg mt-6'>
            Make sure to read all of the servers’ rules, and most importantly, have fun!
          </span>
        </motion.div>
    </div>
  )
}

export default DiscordServers