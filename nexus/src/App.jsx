import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from "./pages/landingpage"
import Navbar from "./components/NavBar"
function App() {

  return (
    <Router>
      <div>
        <Navbar />
        <LandingPage/>
      </div>
    </Router>
  )
}

export default App
