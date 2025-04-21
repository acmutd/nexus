import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { FaGoogle } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [netId, setNetId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const firestoreRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:5001/api/firebase-config')
      .then((res) => res.json())
      .then((firebaseConfig) => {
        console.log('Fetched Firebase Config:', firebaseConfig);
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const firestore = getFirestore(app);
        firestoreRef.current = firestore;
        setAuth(authInstance);
        setLoading(false);

        onAuthStateChanged(authInstance, (user) => {
          if (user) {
            navigate('/home');
          }
        });
      })
      .catch((err) => {
        console.error('Error fetching Firebase config:', err);
        setLoading(false);
        setError('Failed to initialize app. Please try again later.');
      });
  }, [navigate]);

  const signupWithEmail = async (e) => {
    e.preventDefault();
    setError('');

    if (!netId) {
      setError('NetID is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(firestoreRef.current, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        netId: netId,
        discordUsername: null,
        discordId: null,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error signing up:', error);
      const errorMessage = error.message.replace('Firebase: ', '');
      setError(errorMessage);
    }
  };

  const signupWithGoogle = async () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      return;
    }

    if (!netId) {
      setError('NetID is required');
      return;
    }

    const provider = new GoogleAuthProvider();

    try {
      const userCred = await signInWithPopup(auth, provider);
      await setDoc(doc(firestoreRef.current, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: userCred.user.email,
        netId: netId,
        discordUsername: null,
        discordId: null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error signing up:', err);
      const errorMessage = err.message.replace('Firebase: ', '');
      setError(errorMessage);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className={cn("flex flex-col gap-6")}>
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-2xl">Sign up for NextEP</CardTitle>
            <CardDescription>
              Create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signupWithEmail}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label className="text-left" htmlFor="netId">NetID</Label>
                  <Input 
                    id="netId" 
                    type="text" 
                    placeholder="Enter your NetID" 
                    required 
                    value={netId}
                    onChange={(e) => setNetId(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-left" htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-left" htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={passwordVisible ? "text" : "password"} 
                      placeholder="Enter password" 
                      required 
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 cursor-pointer"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? <IoMdEye /> : <IoMdEyeOff />}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-left" htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      type={passwordVisible ? "text" : "password"} 
                      placeholder="Confirm password" 
                      required 
                      className="pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 cursor-pointer"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? <IoMdEye /> : <IoMdEyeOff />}
                    </div>
                  </div>
                </div>
                
                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <Button type="submit" className="w-full">
                  Sign Up
                </Button>

                <Button variant="outline" className="w-full" onClick={signupWithGoogle}>
                  <FaGoogle className="mr-2" />
                  Sign up with Google
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-4">
                  Log in
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}