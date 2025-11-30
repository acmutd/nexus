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
import Upload from './pages/upload';
import Settings from './pages/settings';
import CourseList from './pages/courseList';
import Home from './pages/home';
import CourseEntry from './pages/courseEntryWithTranscript';


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
          <Route path="/settings" element={<Settings/>} />
          <Route path="/grade-calculator" element={<GradeCalculator />} />
          <Route path="/grade-history" element={<GradeHistory />} />
          <Route path="/grade-history/:courseId" element={<GradeHistory />} />
          <Route path="/discordlogin" element={<DiscordLogin />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/LoginWithNetID" element={<LoginWithNetID />}/>
          <Route path="/signup" element={<Signup />}/>
          <Route path="/superdoc" element={<SuperDoc />}/>
          <Route path="/upload" element={<Upload />}/>
          <Route path="/courselist" element={<CourseList />}/>
          <Route path="/home" element={<Home />}/>
        </Routes>

      </div>
    </Router>
  )
}

export default App
