import React from 'react'

function CourseCard(props) {

    return (
        <div className="w-full h-[45px] bg-nexus400 items-center justify-start flex rounded-full">
            <h1 className="font-titilliumWeb-semibold text-white pl-6 text-xl">
                {props.courseInfo} 
            </h1>
        </div>
  )
}

export default CourseCard