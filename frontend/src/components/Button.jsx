import React from 'react'

const Button = ({text, icon, onClick, href, className, disabled}) => {
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
      onClick={disabled ? '' : onClick}
      className={`${className} flex bg-nexus600 w-full h-[40px] rounded-md items-center justify-center 
                 transition duration-300 ${disabled ? "opacity-50" : "hover:scale-105 cursor-pointer"}`}
    >
      <h1 className='font-titilliumWeb-bold tinyText text-white text-lg'>
        {text}
      </h1>
      {icon}
    </button>
  )
}

export default Button