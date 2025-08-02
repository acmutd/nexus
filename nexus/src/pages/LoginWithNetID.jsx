import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-no-repeat bg-cover bg-center">
        <img 
        src="/assets/AccessRequestLongBG.svg" 
        alt="Background" 
        className="absolute top-0 left-5 w-full h-full scale-x-185" 
      />
      <div className="w-[450px] mx-auto mt-10 p-10 bg-blue-200 rounded-xl shadow-md">
        
        <div className="flex justify-start mb-6">
            <img src="/assets/UTDLogo.svg" alt="UTD Logo" className="h-16 mb-6 ml-18" />
            <img src="/assets/Logo.svg" alt="Nexus Logo" className="h-16 mb-6 ml-12"/>
        </div>
        <div>
            
        </div>

        <form>
        <h2 className="text-2xl font-bold text-gray-800 text-left mb-4 py-2">
          Login with E-Learning Credentials
        </h2>

        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            NetID
          </label>
          <input
            type="text"
            id="NetID"
            name="NetID"
            placeholder="Enter NetID"
            className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            E-Learning Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter Password"
            className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base"
          >
            Login
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
