import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="w-[450px] mx-auto mt-10 p-10 bg-blue-200 rounded-xl shadow-md">
      <form>
        <h2 className="text-2xl font-bold text-gray-800 text-left mb-4 py-2">
          Login to Nexus
        </h2>

        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            Email
          </label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Enter Email"
            className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter password"
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

        <div className="text-center text-sm text-gray-700 font-bold">
          Don’t have an account?{' '}
          <Link to="/register" className="font-bold text-blue-700 hover:underline ">
            Register here
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
