import React from 'react'

const Button = ({text, icon, onClick, href}) => {
  return (
    <a className="flex w-full h-[40px] bg-nexus600 rounded-md items-center justify-center 
                    transition duration-300 hover:scale-105 cursor-pointer" onClick={{onClick}} href={href} target='_blank' rel="noreferrer">
        <h1 className='font-titilliumWeb-regular text-white text-lg'>
            {text}
        </h1>
        {icon}
    </a>
  )
}

export default Button