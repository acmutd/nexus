import React, { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { HiArrowRightStartOnRectangle, HiOutlineUsers } from "react-icons/hi2";
import { motion } from 'framer-motion';
import { useMobile } from '../context/mobileContext';
import { useAuth } from '../context/authContext';
import { getAuth } from 'firebase/auth';
import prefixMap from '../../public/prefix_map.json';

const ServerCard = ({
  title, link, banner, icon, description,
  members,
  liveMembers,
  loadingMembers,
}) => {
  const shownMembers =
    typeof liveMembers === 'number' ? liveMembers : members;

  return (
    <div className="flex w-full bg-nexus900 relative rounded-xl pb-6">
      <div
        className="w-full h-[30%] relative bg-cover bg-center rounded-t-xl"
        style={{ backgroundImage: banner }}
      >
        <div className="flex w-[60px] h-[60px] rounded-full bg-nexus900 ml-4 mt-8 items-center justify-center">
          <img className="flex w-[75%] h-[75%] rounded-full" src={icon} />
        </div>

        <div className="flex flex-col justify-between px-6 ">
          <div className="flex flex-col w-full h-full">
            <h1 className="font-titilliumWeb-regular text-white text-md">{title}</h1>
            <h2 className="font-titilliumWeb-regular text-gray-400 text-xs">{description}</h2>
          </div>

          <div className="flex flex-col w-full h-full">
            <div className="flex flex-row mt-3 mb-2 font-titilliumWeb-regular text-xs text-gray-400 items-center">
              <HiOutlineUsers className="mr-1" color="white" size={15} />
              <span>
                {loadingMembers ? 'Loading…' : shownMembers} Members
              </span>
            </div>
            <Button href={link} text="Join Server" icon={<HiArrowRightStartOnRectangle className="ml-2" color="white" size={20} />} />
          </div>
        </div>
      </div>
    </div>
  );
};

function DiscordServers() {
  const {isMobile} = useMobile()
  const navigate = useNavigate();
  const { onboarding, refreshOnboarding } = useAuth();
  const schoolInvite = {
    ecs: 'CknqAB2J5q',
    eps: 'PRGbNG5Aus',
    mgt: 'RDwdNrGwse',
    nsm: 'BxfHe9JGwc',
  };
  const [userCourses, setUserCourses] = useState([]);
  const [derived, setDerived] = useState({ schools: [], invites: [] });

  const servers = [{title: "School of Engineering and Computer Science", link: "https://discord.gg/CknqAB2J5q", banner:"url('/assets/DiscordServerAssets/ECSBanner.png')", icon:"/assets/DiscordServerAssets/ECSIcon.png", description: 'Grind away on coding and engineering problems with your fellow classmates!', members: 225},
                   {title: "School of Economic, Political and Policy Sciences", link: "https://discord.gg/PRGbNG5Aus", banner:"url('/assets/DiscordServerAssets/EPSBanner.png')", icon:"/assets/DiscordServerAssets/EPSIcon.png", description: 'Discuss the socio-economic state of the world with other like-minded students!', members: 155},
                   {title: "School of Management", link: "https://discord.gg/RDwdNrGwse", banner:"url('/assets/DiscordServerAssets/MGTBanner.png')", icon:"/assets/DiscordServerAssets/MGTIcon.png", description: 'Network with prospective talented executives and business analysts!', members: 121},
                   {title: "School of Natural Sciences and Mathematics", link: "https://discord.gg/BxfHe9JGwc", banner:"url('/assets/DiscordServerAssets/NSMBanner.png')", icon:"/assets/DiscordServerAssets/NSMIcon.png", description: 'Solve complex formulas and equations with other mathematicians and scientists!', members: 167},
  ]

  const [liveCounts, setLiveCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState({});
  const [joinBusy, setJoinBusy] = useState(false);

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

  const inviteCodesForSelection = () =>
    servers.map(s => s.link.split('/').pop()).filter(Boolean); // fallback all servers

  const deriveInvitesFromCourses = (courses = []) => {
    const schools = new Set();
    const normalized = [];
    courses.forEach((c) => {
      const rawId = (c.course_id || c.courseId || c.id || '').toString();
      const display = rawId || '(unknown)';
      const prefix = rawId.split('-')[0]?.replace(/[^A-Za-z]/g, '').toLowerCase();
      if (prefix) {
        const school = prefixMap[prefix];
        if (school) schools.add(school);
        else console.log('[JoinAll] unmapped prefix', prefix);
      } else {
        console.log('[JoinAll] no prefix for', c);
      }
      normalized.push({ display, prefix });
    });
    const invites = Array.from(schools).map((s) => schoolInvite[s]).filter(Boolean);
    return { schools: Array.from(schools), invites: Array.from(new Set(invites)), normalized };
  };

  // Listen for OAuth popup results
  useEffect(() => {
    const onMsg = (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'DISCORD_JOIN_ALL_RESULT') {
        console.log('[JoinAll][message] results', msg.data);
        setJoinBusy(false);
      }
      if (msg.type === 'DISCORD_AUTH_ERROR') {
        console.error('[JoinAll][message] error', msg.error);
        setJoinBusy(false);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Preload courses for hover tooltip
  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;
    fetch(`/api/firestore/getCourses?uid=${encodeURIComponent(user.uid)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((courses) => {
        setUserCourses(Array.isArray(courses) ? courses : []);
        const d = deriveInvitesFromCourses(Array.isArray(courses) ? courses : []);
        setDerived(d);
      })
      .catch((e) => console.error('[JoinAll] preload courses failed', e));
  }, []);

  const startJoinAll = async () => {
    try {
      setJoinBusy(true);
      console.log('[JoinAll] start');
      const user = getAuth().currentUser;
      if (!user) {
        console.log('[JoinAll] no user');
        alert('Please log in first.');
        setJoinBusy(false);
        return;
      }
      // Freshly check if this user has Discord linked
      const refreshed = await refreshOnboarding(user);
      if (!refreshed?.discordLinked) {
        alert('Link your Discord account first (Account Linking).');
        setJoinBusy(false);
        navigate('/accountlinking');
        return;
      }
      // Fetch user courses -> derive target invites based on course from prefix map
      let inviteCodes = [];
      try {
        const resp = await fetch(`/api/firestore/getCourses?uid=${encodeURIComponent(user.uid)}`);
        const courses = await resp.json();
        console.log('[JoinAll] courses len', Array.isArray(courses) ? courses.length : 'n/a');
        const derived = deriveInvitesFromCourses(Array.isArray(courses) ? courses : []);
        setUserCourses(Array.isArray(courses) ? courses : []);
        setDerived(derived);
        inviteCodes = derived.invites.length ? derived.invites : inviteCodesForSelection();
        console.log('[JoinAll] schools', derived.schools, 'invites', inviteCodes);
      } catch (e) {
        console.error('[JoinAll] failed to load courses, using all invites', e);
        inviteCodes = inviteCodesForSelection();
      }

      if (!inviteCodes.length) {
        console.log('[JoinAll] nothing selected');
        setJoinBusy(false);
        return;
      }
      const statePayload = {
        mode: 'join_all',
        uid: user.uid,
        invites: inviteCodes,
      };
      const stateParam = encodeURIComponent(JSON.stringify(statePayload));
      const url = `/api/discord/join-all?state=${stateParam}`;
      console.log('[JoinAll] url', url);

      // Probe endpoint first to avoid blank popup / 404
      const probe = await fetch(url, { method: 'HEAD' });
      console.log('[JoinAll] probe status', probe.status);
      const supportsBulk = probe.ok;

      if (supportsBulk) {
        const w = 520, h = 720;
        const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
        const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
        const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;
        const popup = window.open(url, 'discord_join_all', features);
        if (!popup) {
          window.open(servers[0]?.link, '_blank');
          setJoinBusy(false);
          return;
        }
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setJoinBusy(false);
          }
        }, 400);
      }
    } catch (e) {
      console.error('Join-all popup failed:', e);
      setJoinBusy(false);
    }
  };

  return (
    <>
    <div className="inset-0 min-h-screen fixed flex items-center justify-center bg-blue-950 bg-cover bg-center overflow-x-hidden"
         style={{ backgroundImage: "url('/assets/CoursesBG.svg')"}} />
    {/* ----------------------------------- MAIN CONTAINER ---------------------------------------- */}
        <div className='relative flex items-center justify-center w-full min-h-screen'>
          <motion.div className={`flex flex-col min-w-[350px] w-[70%] mt-12 items-center justify-center rounded-2xl bg-gradient-to-b from-nexus900 via-50% via-nexus800 to-90% to-nexus900 p-6 scale-90`}
                      initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}}>
      {/* ----------------------------------- HEADING + SEARCH ---------------------------------------- */}
            <div className="flex flex-col w-full h-full py-2 rounded-xl">
              <h1 className="font-titilliumWeb-bold text-nexus50 headingText">
                Discord Servers
              </h1>
              <span className="font-titilliumWeb-semibold text-gray-300 tinyText mt-4">
                    Use our Smart Join feature to be added to all your necessary servers at once! Hover over the button to see which servers hold your courses.
              </span>
              <div className="flex mt-4 w-full">
                <div className={`${isMobile ? 'w-full' : 'w-auto'}`}>
                  <div className="relative group inline-block">
                    <Button
                      className="bg-nexus600 px-4 py-2"
                      onClick={joinBusy ? undefined : startJoinAll}
                      text={joinBusy ? "Opening Discord…" : "Smart Join"}
                    />
                    <div className="absolute left-0 mt-2 w-72 bg-nexus900 text-white text-xs rounded-md p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                      <div className="font-titilliumWeb-bold mb-1">Your Courses:</div>
                      {derived.normalized?.length ? (
                        <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                          {derived.normalized.map((c, i) => (
                            <li key={`${c.prefix}-${i}`}>{c.display}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-400">No courses loaded yet.</div>
                      )}
                      <div className="font-titilliumWeb-bold mt-1 mb-1">
                        Target Servers: {derived.schools?.length ? derived.schools.join(', ') : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      {/* ----------------------------------- COURSES ---------------------------------------- */}
            <div className={`${isMobile ? 'flex flex-col': 'grid grid-cols-2'} mt-4 gap-6 w-full h-full items-center justify-center overflow-hidden`}>
              {servers.map((item, index) => (
                <div className="flex w-full h-full">
                  <ServerCard link={item.link} title={item.title} banner={item.banner} icon={item.icon} description={item.description} members={item.members} liveMembers={liveCounts[index]} loadingMembers={loadingCounts[index]}/>
                </div>
              ))}
            </div>
            <span className='font-titilliumWeb-regular text-gray-400 text-lg mt-2 text-center'>
              Make sure to read all of the server rules and, most importantly, have fun!
            </span>
          </motion.div>
        </div>
    </>
  )
}

export default DiscordServers
