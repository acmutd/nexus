import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, getDoc, onSnapshot } from 'firebase/firestore';
import { FaDiscord } from 'react-icons/fa';

const Navbar = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);
  const [discordAvatar, setDiscordAvatar] = useState(null);
  const [discordId, setDiscordId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();
  const [db, setDb] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        const { username, id, avatar } = event.data.data;
        setDiscordUsername(username);
        setDiscordId(id);
        setDiscordAvatar(avatar);
        setAuthError(null);
      } else if (event.data?.type === 'DISCORD_AUTH_ERROR') {
        setAuthError('Failed to connect Discord account. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);

    // Fetch Firebase config
    fetch('http://localhost:5001/api/firebase-config')
      .then((res) => res.json())
      .then((firebaseConfig) => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);

        // Listen for auth state changes
        const unsubscribeAuth = onAuthStateChanged(authInstance, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            // Set up real-time listener for user document
            const userRef = doc(dbInstance, 'users', currentUser.uid);
            const unsubscribeDoc = onSnapshot(userRef, (doc) => {
              if (doc.exists()) {
                const data = doc.data();
                setDiscordUsername(data.discordUsername);
                setDiscordId(data.discordId);
                setDiscordAvatar(data.discordAvatar);
              }
            });

            return () => unsubscribeDoc();
          } else {
            setUser(null);
            setDiscordUsername(null);
            setDiscordId(null);
            setDiscordAvatar(null);
            navigate('/login');
          }
        });

        setLoading(false);
        return () => unsubscribeAuth();
      })
      .catch((err) => {
        console.error('Firebase config fetch error:', err);
        setLoading(false);
      });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  const handleDiscordLink = () => {
    if (!user) return;

    const width = 500;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      `http://localhost:5001/api/discord/auth?uid=${user.uid}`,
      'Discord Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      setAuthError('Please allow popups to connect your Discord account');
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
      setDiscordUsername(null);
      setDiscordId(null);
      setDiscordAvatar(null);
      setAuthError(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
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
        {authError && (
          <span className="text-sm text-destructive">{authError}</span>
        )}
        {user && !discordUsername && (
          <Button 
            variant="secondary" 
            className="flex items-center gap-2"
            onClick={handleDiscordLink}
          >
            <FaDiscord className="w-5 h-5" />
            Link Discord
          </Button>
        )}
        {user && discordUsername && (
          <div className="flex items-center gap-2">
            {discordAvatar && (
              <img 
                src={`https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`}
                alt="Discord avatar"
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground">
              Connected as: {discordUsername}
            </span>
          </div>
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