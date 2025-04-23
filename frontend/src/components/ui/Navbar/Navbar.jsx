import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { initiateDiscordAuth, exchangeCodeForToken } from '@/lib/discord';
import { FaDiscord } from 'react-icons/fa';

const Navbar = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [discordId, setDiscordId] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const db = getFirestore();

  useEffect(() => {
    // Handle Discord OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && location.pathname === '/auth/discord/callback') {
      handleDiscordCallback(code);
    }
  }, [location]);

  const handleDiscordCallback = async (code) => {
    try {
      const discordUser = await exchangeCodeForToken(code);
      if (user && discordUser) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          discordId: discordUser.id,
          discordUsername: discordUser.username
        });
        setDiscordId(discordUser.id);
        setDiscordUsername(discordUser.username);
      }
      window.close();
    } catch (error) {
      console.error('Error handling Discord callback:', error);
    }
  };

  useEffect(() => {
    // Fetch the Firebase config from endpoint
    fetch('http://localhost:5001/api/firebase-config')
      .then((res) => res.json())
      .then((firebaseConfig) => {
        console.log('Fetched Firebase Config:', firebaseConfig);
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        setAuth(authInstance);
        setLoading(false);

        // Listen for authentication state changes
        onAuthStateChanged(authInstance, async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            // Fetch user's Discord info from Firestore
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setDiscordId(userData.discordId);
              setDiscordUsername(userData.discordUsername);
            }
          } else {
            setUser(null);
            setDiscordId(null);
            setDiscordUsername(null);
            navigate('/login');
          }
        });
      })
      .catch((err) => {
        console.error('Error fetching Firebase config:', err);
        setLoading(false);
      });
  }, []);

  const logout = () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      return;
    }
    signOut(auth)
      .then(() => {
        console.log('User signed out');
        setUser(null);
        setDiscordId(null);
        setDiscordUsername(null);
      })
      .catch((err) => {
        console.error('Error signing out:', err);
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="container bg-card py-3 px-4 border-0 flex items-center justify-between gap-6 rounded-2xl mt-5">
      <ul className="hidden md:flex items-center gap-10 text-card-foreground">
        <li className="text-primary font-medium">
          <Link to="/">NextEP</Link>
        </li>
        <li>
          <Link to="/faqs">FAQs</Link>
        </li>
      </ul>

      <div className="flex items-center gap-2">
        {user && !discordId && (
          <Button 
            variant="secondary" 
            className="flex items-center gap-2"
            onClick={initiateDiscordAuth}
          >
            <FaDiscord className="w-5 h-5" />
            Link Discord
          </Button>
        )}
        {user && discordUsername && (
          <span className="text-sm text-muted-foreground">
            Connected as: {discordUsername}
          </span>
        )}
        {user ? (
          <Button className="ml-2" onClick={logout}>
            Logout
          </Button>
        ) : (
          <Button variant="secondary">
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>
    </Card>
  );
};

export default Navbar;