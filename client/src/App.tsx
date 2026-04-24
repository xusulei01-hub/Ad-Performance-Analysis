import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@components/layout/MainLayout'
import Dashboard from '@pages/Dashboard'
import ChannelAnalysis from '@pages/ChannelAnalysis'
import DataManagement from '@pages/DataManagement'
import MerchantDataManagement from '@pages/MerchantDataManagement'
import MerchantAnalysis from '@pages/MerchantAnalysis'
import Schedule from '@pages/Schedule'

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/channel-analysis" element={<ChannelAnalysis />} />
          <Route path="/data-management" element={<DataManagement />} />
          <Route path="/merchant-data" element={<MerchantDataManagement />} />
          <Route path="/merchant-analysis" element={<MerchantAnalysis />} />
          <Route path="/schedule" element={<Schedule />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
