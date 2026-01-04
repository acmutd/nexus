import React from 'react'

const Button = ({text, icon, onClick, href}) => {
  if (href) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex w-full h-[40px] bg-nexus600 rounded-md items-center justify-center 
                   transition duration-300 hover:scale-105 cursor-pointer"
      >
        <h1 className='font-titilliumWeb-regular text-white text-lg'>
          {text}
        </h1>
        {icon}
      </a>
    )
  }

  return (
    <button 
      onClick={onClick}
      className="flex w-full h-[40px] bg-nexus600 rounded-md items-center justify-center 
                 transition duration-300 hover:scale-105 cursor-pointer"
    >
      <h1 className='font-titilliumWeb-regular text-white text-lg'>
        {text}
      </h1>
      {icon}
    </button>
  )
}

export default Button