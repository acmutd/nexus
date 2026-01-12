import React, { useContext } from 'react'
import Button from '../components/Button';
import { useMobile } from '../context/mobileContext';

const AccountLinking = () => {

    const {isMobile} = useMobile()

    const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
        <div className="relative">
            <div className={`absolute inset-0 rounded-lg bg-gray-400 shadow-md`}
                 style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
            />
            
            <div
                className="flex flex-col min-h-[265px] items-start bg-white rounded-lg p-6 border border-gray-200 
                        transition duration-300 ease-in-out relative z-10 
                        font-titilliumWeb"
                style={{ height: '100%', width: '100%' }} 
            >
                <div className="mb-4 self-start">{icon}</div> 
                <h3 className="font-bold bodyText text-gray-800 mb-2 text-left w-full">{title}</h3> 
                <p className="text-nexus900 text-left tinyText mb-2 flex-1 w-full"> 
                {description}
                </p>
                <ul className="list-disc list-inside tinyText text-left text-nexus900 w-full mb-6 pl-4">
                {details.map((detail, index) => (
                    <li key={index} className="mb-1">{detail}</li>
                ))}
                </ul>
                <Button text={buttonText} onClick={onClick} />
            </div>
        </div>
    );

    return (
        <div className='min-h-screen w-full bg-center bg-cover bg-nexus900 pt-20 ' 
            style={{backgroundImage: "url('/assets/AccessRequestBG.svg')"}}>

            <div className='flex flex-col w-full h-full items-center justify-center scale-90'>
                <h1 className='headingText text-white font-titilliumWeb-bold mb-2'>
                    Account Linking
                </h1>
                <div className='flex flex-col bg-nexus50 p-6 rounded-xl items-center justify-center w-[54%] min-w-[300px]'>
                    <div className='flex flex-col text-center mx-6 mb-4'>
                        <p className="headingText font-titilliumWeb-bold text-nexus900 mb-2">
                            Link Your Google and Discord Accounts:
                        </p>
                        <p className="bodyText font-titilliumWeb-regular text-nexus800 mb-2">
                            To access Nexus’ main features, linking your Discord and Google account will be needed. If you want to skip it for now, you can link them later in your account settings page.
                        </p>
                    </div>

                    <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-8 justify-center items-stretch mb-6`}>
                        <OptionBox
                            icon={
                            <img
                                src="/assets/DiscordIcon.svg"
                                alt="Login"
                                className="w-10 h-10"
                            />
                            }
                            title="Link Discord"
                            description="LInking your Discord will give you access to your courses in each class Discord server."
                            details={[]}
                            buttonText="Click to Login"
                        />
                        <OptionBox
                            icon={
                            <img
                                src="/assets/GoogleIcon.svg"
                                alt="Login"
                                className="w-10 h-10"
                            />
                            }
                            title="Link Google"
                            description="Linking your Google Account will give you access to make edits to the SuperDoc."
                            details={[]}
                            buttonText="Click to Login"
                        />
                    </div>

                    <div className='flex flex-col w-full gap-2'>
                        <Button disabled={true} text={"Continue"} onClick={""}/>
                        <Button className="bg-gray-500" text={"Skip"} onClick={""}/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountLinking