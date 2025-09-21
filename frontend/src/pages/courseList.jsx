import React, { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive';
import { HiOutlineSearch } from "react-icons/hi";

function CourseList() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })

  const courses = new Map([["ECS", "Some Discord Link"], ["EPS", "Some Discord Link"], ["MGT", "Some Discord Link"], ["NSM", "Some Discord Link"]])

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center"
      style={{ backgroundImage: isMed ? "url('/assets/CoursesLongBG.svg')" : "url('/assets/CoursesBG.svg')" }}>
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
                Discord Link
              </h1>
            </div>
            {/* COURSES */}
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

          </div>
        </div>
    </div>
  )
}

export default CourseList