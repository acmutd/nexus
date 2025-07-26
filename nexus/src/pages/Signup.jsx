import { Link } from "react-router-dom";
import React, { useState } from "react";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950">
      <div className="w-[450px] mx-auto mt-10 p-10 bg-blue-200 rounded-xl shadow-md">
        <form>
        <h2 className="text-2xl font-bold text-gray-800 text-left mb-4 py-2">
          Sign-Up
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
            id="email"
            name="email"
            placeholder="Enter Email"
            className="w-full bg-white text-black px-4 py-2 border-solid placeholder-gray-400 rounded-md focus:outline-none"
          />
        </div>

        <div className="mb-4 relative">
          <label
            htmlFor="password"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="Enter password"
            className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded-md focus:outline-none placeholder-gray-400"
          />
          {/* <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-10 right-4 transform -translate-y-1/2 text-gray-500"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-3 w-3" />
            ) : (
              <EyeIcon className="h-3 w-3" />
            )}
          </button> */}
        </div>

        <div className="mb-4">
          <label
            htmlFor="confirm_password"
            className="block text-left text-blue-700 mb-2 font-semibold"
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="confirm_password"
            name="confirm_password"
            placeholder="Confirm Password"
            className="w-full text-black bg-white px-4 py-2 border-solid placeholder-gray-400 rounded-md focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <button
            type="submit"
            className="w-full bg-blue text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base"
          >
            Sign Up With Google
          </button>
        </div>

        <div className="mb-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base"
          >
            Sign Up
          </button>
        </div>

        <div className="text-center text-sm text-blue-700 font-bold">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-blue-700 hover:underline">
            LOGIN HERE
          </Link>
        </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;