import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { FaGoogle } from "react-icons/fa";
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase'; 

const LoginPage = () => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      setLoading(false);

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate('/');
        }
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
      setError('Failed to initialize app. Please try again later.');
    }
  }, [navigate]);

  // Email login
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const auth = getFirebaseAuth();
      
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in 
          const user = userCredential.user;
          console.log('User signed in:', user);
          
          user.getIdToken().then(token => {
            console.log('AUTH TOKEN FOR API TESTING:', token);
            localStorage.setItem('token', token);
          });
        })
        .catch((err) => {
          console.error('Error signing in:', err);
          const errorMessage = err.message.replace('Firebase: ', '');
          setError(errorMessage);
        });
    } catch (error) {
      setError('Authentication not initialized');
    }
  };

  // Google login
  const loginWithGoogle = () => {
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
    
      signInWithPopup(auth, provider)
        .then((userCred) => {
          console.log('User signed in:', userCred.user);
          
          userCred.user.getIdToken().then(token => {
            console.log('AUTH TOKEN FOR API TESTING:', token);
            localStorage.setItem('token', token);
          });
        })
        .catch((err) => {
          console.error('Error signing in with Google:', err);
          const errorMessage = err.message.replace('Firebase: ', '');
          setError(errorMessage);
        });
    } catch (error) {
      console.error('Firebase Auth is not initialized');
      setError('Authentication not initialized');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-nexus-blue-700 to-nexus-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-t from-nexus-blue-700 to-nexus-blue-900 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-white p-8 rounded-lg shadow-md w-96 bg-gradient-to-b from-nexus-blue-100 via-white to-nexus-blue-100"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.h2
          className="text-2xl font-bold mb-6 text-nexus-blue-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Login to Nexus
        </motion.h2>
        <form onSubmit={handleSubmit}>
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <label
              htmlFor="email"
              className="block text-sm font-medium text-nexus-blue-600 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-nexus-blue-300 focus:ring focus:ring-nexus-blue-200 focus:ring-opacity-50 text-nexus-blue-800 p-2 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
            />
          </motion.div>
          <motion.div
            className="mb-6 relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <label
              htmlFor="password"
              className="block text-sm font-medium text-nexus-blue-600 mb-1"
            >
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-nexus-blue-300 focus:ring focus:ring-nexus-blue-200 focus:ring-opacity-50 text-nexus-blue-800 pr-10 p-2 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <HiEyeOff className="h-5 w-5 text-gray-500" />
              ) : (
                <HiEye className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </motion.div>
          
          {error && (
            <motion.p 
              className="mb-4 text-red-500 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.p>
          )}
          
          <motion.button
            type="submit"
            className="w-full bg-nexus-blue-600 text-white rounded-md py-2 px-4 hover:bg-nexus-blue-700 focus:outline-none focus:ring-2 focus:ring-nexus-blue-500 focus:ring-opacity-50 text-base mb-3"
          >
            Log In
          </motion.button>
          
          <motion.button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-nexus-blue-500 focus:ring-opacity-50 text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <FaGoogle className="mr-2 text-red-500" />
            Login with Google
          </motion.button>
        </form>
        <motion.p
          className="mt-4 text-center text-sm text-nexus-blue-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-nexus-blue-800 group relative"
          >
            REGISTER HERE
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
          </Link>
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;