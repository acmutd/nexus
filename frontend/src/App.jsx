import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'simplebar-react/dist/simplebar.min.css';
import LandingPage from "./pages/landingpage"
import AccessRequest from './pages/accessrequest';
//import CourseEntry from './pages/courseEntry';
import DiscordLogin from './pages/discordlogin';
import Navbar from "./components/Navbar"
import Login from './pages/Login';
import LoginWithNetID from "./pages/LoginWithNetID";
import Signup from './pages/Signup';
import GradeCalculator from './pages/GradeCalculator';
import GradeHistory from './pages/GradeHistory';
import SuperDoc from './pages/superdoc';
import SuperDocUpload from './pages/SuperDocUpload';
import Settings from './pages/settings';
import DiscordServers from './pages/DiscordServers';
import Home from './pages/Home';
import CourseEntry from './pages/courseEntryWithTranscript';
import AccessRequestContinue from './pages/AccessRequestContinue';

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
          <Route path="/courseentry" element={<CourseEntry />}/>
          <Route path="/settings" element={<Settings/>} />
          <Route path="/grade-calculator" element={<GradeCalculator />} />
          <Route path="/grade-history" element={<GradeHistory />} />
          <Route path="/grade-history/:courseId" element={<GradeHistory />} />
          <Route path="/discordlogin" element={<DiscordLogin />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/LoginWithNetID" element={<LoginWithNetID />}/>
          <Route path="/signup" element={<Signup />}/>
          <Route path="/superdoc" element={<SuperDoc />}/>
          <Route path="/superdocupload" element={<SuperDocUpload />}/>
          <Route path="/discordservers" element={<DiscordServers />}/>
          <Route path="/home" element={<Home />}/>
          <Route path="/accessrequestcontinue" element={<AccessRequestContinue />}/>
        </Routes>

      </div>
    </Router>
  )
}

export default App
