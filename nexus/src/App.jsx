import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from "./pages/landingpage"
import AccessRequest from './pages/accessrequest';
import DiscordLogin from './pages/discordlogin';
import Navbar from "./components/NavBar"

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
          <Route path="/discordlogin" element={<DiscordLogin />}/>
        </Routes>

      </div>
    </Router>
  )
}

export default App
