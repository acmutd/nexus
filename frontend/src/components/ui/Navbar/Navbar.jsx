import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const Navbar = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the Firebase config from endpoint
    fetch('http://localhost:5001/api/firebase-config')
      .then((res) => res.json())
      .then((firebaseConfig) => {
        console.log('Fetched Firebase Config:', firebaseConfig); // Log the config
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        setAuth(authInstance);
        setLoading(false);

        // Listen for authentication state changes
        onAuthStateChanged(authInstance, (user) => {
          if (user) {
            setUser(user);
          } else {
            setUser(null);
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
    // Firebase signout built in
    signOut(auth)
      .then(() => {
        console.log('User signed out');
        setUser(null);
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

      <div className="flex items-center">
        {user ? (
          <Button className="ml-2 mr-2" onClick={logout}>
            Logout
          </Button>
        ) : (
          <Button variant="secondary" className="px-2">
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>
    </Card>
  );
};

export default Navbar;