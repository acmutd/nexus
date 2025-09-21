import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { FaGoogle } from "react-icons/fa";
import { motion } from 'framer-motion';
import LoadingScreen from '../components/LoadingScreen';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase'; 

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create initial user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        registrationComplete: false
      });
      
      navigate('/onboarding');
    } catch (error) {
      console.error('Error signing up:', error);
      const errorMessage = error.message.replace('Firebase: ', '');
      setError(errorMessage);
    }
  };

  const signupWithGoogle = async () => {
    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();
      
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      
      // Create initial user document in Firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: userCred.user.email,
        createdAt: new Date().toISOString(),
        registrationComplete: false
      });
      
      navigate('/onboarding');
    } catch (err) {
      console.error('Error signing in with Google:', err);
      const errorMessage = err.message.replace('Firebase: ', '');
      setError(errorMessage);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-nexus-blue-300 focus:ring focus:ring-nexus-blue-200 focus:ring-opacity-50 text-nexus-blue-800 p-2 text-base";

  if (loading) {
    return <LoadingScreen message="Setting up your account..." />;
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-nexus-blue-800 via-nexus-blue-900 to-nexus-blue-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg bg-gradient-to-b from-nexus-blue-100 via-white to-nexus-blue-10"
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
          Create Nexus Account
        </motion.h2>
        
        {error && (
          <motion.div 
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}
        
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
              className={inputClassName}
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
              className={`${inputClassName} pr-10`}
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
          
          <motion.button
            type="submit"
            className="w-full bg-nexus-blue-600 text-white rounded-md py-2 px-4 hover:bg-nexus-blue-700 focus:outline-none focus:ring-2 focus:ring-nexus-blue-500 focus:ring-opacity-50 text-base mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Sign Up
          </motion.button>
          
          <motion.button
            type="button"
            onClick={signupWithGoogle}
            className="w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-nexus-blue-500 focus:ring-opacity-50 text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <FaGoogle className="mr-2 text-red-500" /> Sign up with Google
          </motion.button>
        </form>
        
        <motion.p
          className="mt-4 text-center text-sm text-nexus-blue-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-nexus-blue-800 group relative"
          >
            LOG IN HERE
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
          </Link>
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default RegisterPage;