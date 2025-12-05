import './App.css'
import './styles/colors.css'
import './styles/satoshi.css'

import { ChatBruti } from './components/ChatBruti.tsx'
import Navbar from './components/Navbar/Navbar.tsx'
import Content1 from './components/Content1/Content1.tsx'
import Content2 from './components/Content2/Content2.tsx'
import Content3 from './components/Content3/Content3.tsx'
import Content4 from './components/Content4/Content4.tsx'
import Content5 from './components/Content5/Content5.tsx'
import Footer from './components/Footer/Footer.tsx'
import VisualizerPage from './VisualizerPage'

export { VisualizerPage } from './VisualizerPage'

export default function App() {
  const path = window.location.pathname
  if (path.startsWith('/visualizer')) {
    return (
      <>
        <Navbar />
        <VisualizerPage />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="content-grid">
        <Content1 />
        <Content2 />
        <Content3 />
        <Content4 />
        <Content5 />
      </div>
      <ChatBruti />
      <Footer />
    </>
  )
}
