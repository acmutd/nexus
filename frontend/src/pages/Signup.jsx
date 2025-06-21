import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { doc, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import JSEncrypt from 'jsencrypt';

async function rsaEncrypt(message, publicKey) {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);
  const encrypted = encrypt.encrypt(message);
  if (!encrypted) throw new Error('Encryption failed');
  return encrypted;
}

export default function Signup() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [netId, setNetId] = useState('');
  const [email, setEmail] = useState('');
  const [elearningPassword, setElearningPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const firestoreRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:5001/api/firebase-config')
      .then(res => res.json())
      .then(firebaseConfig => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const firestore = getFirestore(app);
        firestoreRef.current = firestore;
        setAuth(authInstance);
        setLoading(false);

        onAuthStateChanged(authInstance, (user) => {
          if (user) navigate('/home');
        });
      })
      .catch(err => {
        console.error('Error fetching Firebase config:', err);
        setLoading(false);
        setError('Failed to initialize app.');
      });
  }, [navigate]);

  const handleScraperQuery = async () => {
    try {
      const publicKey = import.meta.env.VITE_PUBLIC_RSA_KEY;
      const scraperUrl = import.meta.env.VITE_SCRAPER_URL;

      const encryptedPayload = {
        netid: await rsaEncrypt(netId, publicKey),
        password: await rsaEncrypt(elearningPassword, publicKey)
      };

      const response = await fetch(scraperUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptedPayload)
      });
      const scraper_response = await response.json();
      return (scraper_response.status === 'success') ? scraper_response.courses : [];
    } catch (err) {
      console.error('Scraper error:', err);
      return [];
    }
  };

  const checkAndAllocateDiscordCourses = async (uid, courses) => {
    try {
      const userDocRef = doc(firestoreRef.current, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { discordId, servers } = userData;
        if (discordId && servers && servers.length > 0) {
          const res = await fetch('http://localhost:3000/discord/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId, servers, courses })
          });
          const result = await res.json();
          if (!res.ok) {
            console.error('Allocation error:', result);
          } else {
            console.log('✅ Allocation successful:', result);
          }
        }
      }
    } catch (err) {
      console.error('Error during allocation check:', err);
    }
  };

  const signupWithEmail = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const courses = await handleScraperQuery();

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await setDoc(doc(firestoreRef.current, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        netId,
        discordUsername: null,
        discordId: null,
        createdAt: new Date().toISOString(),
        courses,
        servers: []
      });

      // After signup, check if allocation is needed
      await checkAndAllocateDiscordCourses(user.uid, courses);

    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up for NextEP</CardTitle>
          <CardDescription>Create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signupWithEmail} className="flex flex-col gap-4">
            <Input id="netId" placeholder="NetID" value={netId} onChange={e => setNetId(e.target.value)} required />
            <Input type="password" placeholder="eLearning Password" value={elearningPassword} onChange={e => setElearningPassword(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type={passwordVisible ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input type={passwordVisible ? 'text' : 'password'} placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            <Button type="button" onClick={() => setPasswordVisible(!passwordVisible)}>
              {passwordVisible ? <IoMdEye /> : <IoMdEyeOff />} Show/Hide Password
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit">Sign Up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}