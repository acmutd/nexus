<<<<<<< Updated upstream
import React, { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive';
import { HiOutlineSearch } from "react-icons/hi";

function CourseList() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })

  const courses = new Map([["ECS", "Some Discord Link"], ["EPS", "Some Discord Link"], ["MGT", "Some Discord Link"], ["NSM", "Some Discord Link"]])

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center"
      style={{ backgroundImage: isMed ? "url('/assets/CoursesBackgroundLong.svg')" : "url('/assets/CoursesBackground.svg')" }}>
    {/* ----------------------------------- MAIN CONTAINER ---------------------------------------- */}
        <div className={`flex flex-col w-1/2 h-full items-center rounded-4xl mt-15 bg-gradient-to-b from-nexus900 via-50% via-nexus800 to-90% to-nexus900 py-12`}>
    {/* ----------------------------------- HEADING + SEARCH ---------------------------------------- */}
          <div className="flex flex-row justify-between w-[90%] py-2 rounded-xl bg-nexus800 items-center">
            <h1 className="font-titilliumWeb-bold text-nexus50 text-4xl ml-2">
              School Servers
            </h1>
          </div>
    {/* ----------------------------------- CATEGORIES ---------------------------------------- */}
          <div className="flex flex-col w-full h-full items-center overflow-hidden">
            {/* HEADINGS */}
            <div className="flex flex-row w-full pl-10">
              <h1 className={`font-titilliumWeb-semibold text-nexus50 text-3xl mt-8 w-[32%]`}>
                School
              </h1>
              <h1 className="font-titilliumWeb-semibold text-nexus50 text-3xl mt-8">
=======
import React, { useState } from 'react'
import { HiOutlineSearch } from "react-icons/hi";

function CourseList() {
  const [search, setSearch] = useState("")

  const courses = []

  const filteredSearch = search === '' ? courses : 
            courses.filter((section) => {section.toLowerCase().includes(courses.toLowerCase())})

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/CoursesBackground.svg')" }}>
    {/* ----------------------------------- MAIN CONTAINER ---------------------------------------- */}
        <div className="flex flex-col w-1/2 h-140 rounded-4xl mt-15 bg-gradient-to-b from-nexus900 via-50% via-nexus800 to-90% to-nexus900 ">
    {/* ----------------------------------- HEADING + SEARCH ---------------------------------------- */}
          <div className="flex flex-row justify-between w-full">
            <h1 className="font-titilliumWeb-bold text-nexus50 text-4xl mt-8 ml-10">
              Class Servers
            </h1>
            <div className="flex w-65 h-10 bg-black rounded-full mt-8 mr-10 items-center">
              <input className="w-full h-full rounded-l-full placeholder-gray-500 pl-3 text-white focus:outline-0"
                placeholder='Search Section' />
              <HiOutlineSearch color='#6a7282' size={30} className='mr-3'/>
            </div>
          </div>
    {/* ----------------------------------- CATEGORIES ---------------------------------------- */}
          <div className="flex flex-col w-full h-full items-center overflow-y-hidden">
            {/* HEADINGS */}
            <div className="flex flex-row w-full">
              <h1 className="font-titilliumWeb-bold text-nexus50 text-3xl mt-8 ml-10">
                ID
              </h1>
              <h1 className="font-titilliumWeb-bold text-nexus50 text-3xl mt-8 ml-15">
                Subject + Section
              </h1>
              <h1 className="font-titilliumWeb-bold text-nexus50 text-3xl mt-8 ml-35">
>>>>>>> Stashed changes
                Discord Link
              </h1>
            </div>
            {/* COURSES */}
<<<<<<< Updated upstream
            {
              Array.from(courses).map(([course, link]) => (
                <div className="flex items-center w-[90%] h-[60px] m-2 rounded-lg bg-nexus900 border-2 border-nexus600">
                  <div className={`flex flex-row w-[35%] items-center rounded-lg pl-2`}>
                    <p className="text-white text-2xl font-titilliumWeb-semibold">
                      {course}
                    </p>
                  </div>
                  <div>
                    <a href={link} className="text-blue-400 hover:underline text-xl font-titilliumWeb-regular">
                      Join Server
                    </a>
                  </div>
                </div>
              ))
            }
=======
>>>>>>> Stashed changes

          </div>
        </div>
    </div>
  )
}

export default CourseList