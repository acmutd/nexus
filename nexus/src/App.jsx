import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from "./pages/landingpage"
import AccessRequest from './pages/accessrequest';
import CourseEntry from './pages/courseEntry';
import DiscordLogin from './pages/discordlogin';
import Navbar from "./components/NavBar"
import Login from './pages/Login';
import Signup from './pages/Signup';
function App() {

  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={
            <LandingPage/>
          }/>
          <Route path="/accessrequest" element={<AccessRequest />}/>
          <Route path="/courseEntry" element={<CourseEntry />}/>
          <Route path="/discordlogin" element={<DiscordLogin />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/signup" element={<Signup />}/>
        </Routes>

      </div>
    </Router>
  )
}

export default App
