import './App.css'
import { ChatBruti } from './components/ChatBruti.tsx';
import Navbar from "./components/Navbar/Navbar.tsx";
import './styles/colors.css';

function App() {
    return (
        <>
            <Navbar></Navbar>
            <ChatBruti />
        </>
    )
}

export default App
