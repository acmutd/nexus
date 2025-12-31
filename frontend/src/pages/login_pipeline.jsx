import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

export default function login_pipeline() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });
  const navigate = useNavigate();

  const nexusBlue = '#01579b';

  const shadowAccentColor = 'bg-gray-400'; 

  const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (

    <div
      className="relative"
      style={{ width: isMed ? "100%" : "45%", minHeight: "300px" }}
    >
      <div
        className={`absolute inset-0 rounded-lg ${shadowAccentColor} shadow-md`}
        style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
      ></div>


      <div
  className="flex flex-col items-start bg-white rounded-lg p-6 border border-gray-200 
             transition duration-300 ease-in-out cursor-pointer relative z-10
             font-titilliumWeb"
  style={{ height: '100%', width: '100%' }} 
  onClick={onClick}
>
        <div className="text-4xl text-blue-600 mb-4 self-start">{icon}</div> 
        <h3 className="font-bold text-xl text-gray-800 mb-2 text-left w-full">{title}</h3> 
        <p className="text-blue-900 text-left text-sm mb-4 flex-1 w-full"> 
          {description}
        </p>
        <ul className="list-disc list-inside text-sm text-left text-blue-900 w-full mb-6 pl-4">
          {details.map((detail, index) => (
            <li key={index} className="mb-1">{detail}</li>
          ))}
        </ul>
        <button
          className="w-full py-2 rounded-lg font-bold text-white transition duration-300"
          style={{ backgroundColor: nexusBlue }} 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-blue-950 bg-cover bg-center pt-20 pb-16"
      style={{
        backgroundImage: isMed
          ? "url('/assets/AccessRequestBGLong.svg')"
          : "url('/assets/AccessRequestBG.svg')",
      }}
    >
      <div className="flex items-center justify-center flex-col">
        

        <h1
          className="font-titilliumWeb-bold text-white text-4xl mb-4"
          style={{ zIndex: 1 }}
        >
          Before We Begin:
        </h1>


        <div
          className="flex flex-col bg-blue-100 rounded-xl shadow-2xl p-8"
          style={{
            zIndex: 2,
            width: isMed ? "90%" : "50rem",
            minHeight: isMed ? "auto" : "28rem",
          }}
        >

          <div className="text-center mb-6">
            <p className="text-lg font-semibold text-blue-800 mb-2">
              Nexus Needs Access to your Courses:
            </p>
            <p className="text-md text-blue-600">
              Login Through eLearning and let Nexus' Web Scraper do the Rest.
            </p>
            <p className="text-md font-bold text-blue-800 mt-3 mb-4">
              OR
            </p>
            <p className="text-md text-blue-600">
              Upload Your Transcript for Automatic Parsing
            </p>
          </div>


          <div
            className={`flex ${isMed ? "flex-col" : "flex-row"} w-full h-full gap-8 justify-center items-stretch`}
          >
            
            <OptionBox
              icon={
                    <img
                      src="/assets/loginIcon.svg"
                      alt="Login"
                      className="w-10 h-10"
                    />
                  }
              title="Login via eLearning"
              description="Allow Nexus to directly access your courses in eLearning via our Web Scraper."
              details={["Quick Login", "Real-Time Sync"]}
              buttonText="Click to Login"
              onClick={() => navigate('/elearning-login')}
            />

            <OptionBox
              icon={
                    <img
                      src="/assets/uploadIcon.svg"
                      alt="Login"
                      className="w-10 h-10"
                    />
                  }
              title="Upload Transcript"
              description="Directly upload your latest transcript and let Nexus parse your courses."
              details={["Quick Upload", "No Login"]}
              buttonText="Click to Upload"
              onClick={() => navigate('/upload-transcript')}
            />

          </div>
          <p className="text-blue-900 text-center mt-6" style={{ zIndex: 1 }}>
          Don't worry, your data is secure and we only access schedule-related info.
        </p>
        </div>
        
        

      </div>
    </div>
  );
}