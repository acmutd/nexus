import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, updateDoc } from 'firebase/firestore';
import { FaDiscord } from 'react-icons/fa';
import { ReloadIcon } from '@radix-ui/react-icons';
import JSEncrypt from 'jsencrypt';

const Navbar = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);
  const [discordAvatar, setDiscordAvatar] = useState(null);
  const [discordId, setDiscordId] = useState(null);
  const [servers, setServers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [authError, setAuthError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [coursesLinked, setCoursesLinked] = useState(false);
  const [netId, setNetId] = useState('');
  const [elearningPassword, setElearningPassword] = useState('');
  const [showCredForm, setShowCredForm] = useState(false);

  const navigate = useNavigate();
  const rsaKey = import.meta.env.VITE_PUBLIC_RSA_KEY;

  useEffect(() => {
    fetch('http://localhost:5001/api/firebase-config')
      .then(res => res.json())
      .then(firebaseConfig => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);

        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            const userRef = doc(dbInstance, 'users', currentUser.uid);
            onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setDiscordUsername(data.discordUsername);
                setDiscordId(data.discordId);
                setDiscordAvatar(data.discordAvatar);
                setServers(data.servers || []);
                setCourses(data.courses || []);
                setCoursesLinked(data.courses && data.courses.length > 0);
              }
            });
          } else {
            setUser(null);
            navigate('/login');
          }
        });

        setLoading(false);
        return () => unsubscribe();
      })
      .catch(err => {
        console.error('Firebase config fetch error:', err);
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        const { username, id, avatar } = event.data.data;
        setDiscordUsername(username);
        setDiscordId(id);
        setDiscordAvatar(avatar);
        setAuthError(null);

        try {
          const response = await fetch('http://localhost:5001/api/discord/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId: id, courses })
          });

          if (!response.ok) {
            throw new Error('Failed to allocate courses');
          }

          const data = await response.json();
          console.log('✅ Allocation success:', data);
        } catch (err) {
          console.error('❌ Error allocating Discord courses:', err);
          setAuthError('Failed to allocate Discord roles. Please try again.');
        }
      } else if (event.data?.type === 'DISCORD_AUTH_ERROR') {
        setAuthError('Failed to connect Discord account. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [courses]);

  const encryptData = async (message) => {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(rsaKey);
    const encrypted = encrypt.encrypt(message);
    if (!encrypted) throw new Error('Encryption failed');
    return encrypted;
  };

  const fetchBlackboardData = async () => {
    if (!user) return;

    setIsFetching(true);
    setAuthError(null);

    try {
      const encryptedNetId = await encryptData(netId);
      const encryptedPassword = await encryptData(elearningPassword);

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: JSON.stringify({
            netid: encryptedNetId,
            password: encryptedPassword
          })
        })
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      if (data.status !== 'success' || !data.courses) {
        throw new Error(data.message || 'Scraper failed or no courses returned');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        courses: data.courses,
        lastUpdated: new Date()
      });

      setCourses(data.courses);
      setCoursesLinked(true);
      setShowCredForm(false);
      setNetId('');
      setElearningPassword('');
    } catch (err) {
      console.error('API fetch or Firestore error:', err);
      setAuthError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

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

  const handleDiscordUnlink = async () => {
    if (!user) return;

    try {
      const response = await fetch('http://localhost:5001/api/discord/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });

      if (!response.ok) {
        throw new Error('Failed to unlink Discord account');
      }

      setDiscordUsername(null);
      setDiscordId(null);
      setDiscordAvatar(null);
      setAuthError(null);
    } catch (err) {
      console.error('Error unlinking Discord:', err);
      setAuthError('Failed to unlink Discord account');
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

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

      <div className="flex flex-col gap-2">
        {authError && (
          <span className="text-sm text-destructive">{authError}</span>
        )}
        {user && (
          <>
            {coursesLinked ? (
              <Button variant="outline" disabled className="bg-emerald-400 text-black">
                Courses Linked
              </Button>
            ) : (
              <>
                {!showCredForm && (
                  <Button variant="outline" onClick={() => setShowCredForm(true)}>
                    Link Courses
                  </Button>
                )}
                {showCredForm && (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      placeholder="NetID"
                      value={netId}
                      onChange={(e) => setNetId(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="eLearning Password"
                      value={elearningPassword}
                      onChange={(e) => setElearningPassword(e.target.value)}
                    />
                    <Button
                      onClick={fetchBlackboardData}
                      disabled={isFetching}
                      className="flex items-center gap-2"
                    >
                      {isFetching ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
            {!discordUsername ? (
              <Button variant="secondary" onClick={handleDiscordLink} className="flex items-center gap-2">
                <FaDiscord className="w-5 h-5" />
                Link Discord
              </Button>
            ) : (
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDiscordUnlink}
                >
                  Unlink
                </Button>
              </div>
            )}
            <Button className="ml-2" onClick={logout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default Navbar;