import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@components/layout/MainLayout'
import Dashboard from '@pages/Dashboard'
import ChannelAnalysis from '@pages/ChannelAnalysis'
import DataManagement from '@pages/DataManagement'

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/channel-analysis" element={<ChannelAnalysis />} />
          <Route path="/data-management" element={<DataManagement />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
