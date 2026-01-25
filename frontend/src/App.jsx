import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'simplebar-react/dist/simplebar.min.css';
import LandingPage from "./pages/landingpage"
import DiscordLogin from './pages/discordlogin';
import { RequireAuth } from './context/authContext';
import Navbar from "./components/Navbar";
import Login from './pages/Login';
import Signup from './pages/Signup';
import GradeCalculator from './pages/GradeCalculator';
import GradeHistory from './pages/GradeHistory';
import SuperDoc from './pages/superdoc';
import SuperDocUpload from './pages/SuperDocUpload';
import Settings from './pages/settings';
import DiscordServers from './pages/DiscordServers';
import Home from './pages/Home';
import CourseLinking from './pages/CourseLinking';
import AccountLinking from './pages/AccountLinking';
import ResetPassword from './pages/ResetPassword';
import UnderConstruction from './pages/UnderConstruction';

function App() {

  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage/>}/>
          <Route path="/underconstruction" element={<UnderConstruction/>}/>
          <Route path="/settings" element={<RequireAuth><Settings/></RequireAuth>} />
          <Route path="/grade-calculator" element={<RequireAuth><GradeCalculator /></RequireAuth>} />
          <Route path="/grade-history" element={<RequireAuth><GradeHistory /></RequireAuth>} />
          <Route path="/grade-history/:courseId" element={<RequireAuth><GradeHistory /></RequireAuth>} />
          <Route path="/discordlogin" element={<RequireAuth><DiscordLogin /></RequireAuth>} />
          <Route path="/login" element={<Login />}/>
          <Route path="/signup" element={<Signup />}/>
          <Route path="/superdoc" element={<RequireAuth><SuperDoc /></RequireAuth>} />
          <Route path="/superdocupload" element={<RequireAuth><SuperDocUpload /></RequireAuth>} />
          <Route path="/discordservers" element={<RequireAuth><DiscordServers /></RequireAuth>} />
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/CourseLinking" element={<RequireAuth><CourseLinking /></RequireAuth>} />
          <Route path="/accountlinking" element={<RequireAuth><AccountLinking /></RequireAuth>} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>

      </div>
    </Router>
  )
}

export default App
