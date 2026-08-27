import React from 'react'

const Button = ({text, icon, onClick, href, className, disabled, title}) => {
  if (href) {
    return (
      <a 
        href={disabled ? '' : href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${className} flex bg-nexus600 w-full h-[40px] rounded-md items-center justify-center active:scale-95 
                  transition duration-300  ${disabled ? "opacity-50" : "hover:scale-102 cursor-pointer"}`}
        title={title}
      >
        <h1 className='font-titilliumWeb-semibold text-white text-lg'>
          {text}
        </h1>
        {icon}
      </a>
    )
  }

  return (
    <button 
      onClick={disabled ? undefined : onClick}
      className={`${className} flex bg-nexus600 w-full h-[40px] rounded-md items-center justify-center active:scale-95 
                 transition duration-300  ${disabled ? "opacity-50" : "hover:scale-102 cursor-pointer"}`}
      title={title}
      disabled={disabled}
    >
      <h1 className='font-titilliumWeb-bold tinyText text-white text-lg'>
        {text}
      </h1>
      {icon}
    </button>
  )
}

export default Button