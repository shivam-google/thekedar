import { Route, Routes } from 'react-router-dom'
import RoleGuard from './components/RoleGuard'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ForgotPassword from './pages/ForgotPassword'
import Favorites from './pages/Favorites'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import BookingDetails from './pages/BookingDetails'
import BookingRequests from './pages/BookingRequests'
import Bookings from './pages/Bookings'
import Home from './pages/Home'
import Login from './pages/Login'
import MachineDetails from './pages/MachineDetails'
import Machines from './pages/Machines'
import MarketplacePlaceholder from './pages/MarketplacePlaceholder'
import NewMachine from './pages/NewMachine'
import ProjectCart from './pages/ProjectCart'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import Signup from './pages/Signup'
import WorkerDetails from './pages/WorkerDetails'
import WorkerProfile from './pages/WorkerProfile'
import Workers from './pages/Workers'
import TankerDetails from './pages/TankerDetails'
import TankerProfile from './pages/TankerProfile'
import Tankers from './pages/Tankers'
import MaterialDetails from './pages/MaterialDetails'
import MaterialProfile from './pages/MaterialProfile'
import Materials from './pages/Materials'
import Notifications from './pages/Notifications'
import { AboutPage, ContactPage, HelpPage, PrivacyPage, TermsPage } from './pages/InformationalPages'
import NotFound from './pages/NotFound'
import ProviderAssets from './components/ProviderAssets'
import Footer from './components/Footer'
import Navbar from './components/Navbar'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><div className="site-page"><Navbar /><main className="dashboard-page"><ProviderAssets /></main><Footer /></div></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/machines" element={<Machines />} />
      <Route path="/machines/new" element={<ProtectedRoute><NewMachine /></ProtectedRoute>} />
      <Route path="/machines/:id/edit" element={<ProtectedRoute><NewMachine /></ProtectedRoute>} />
      <Route path="/machines/:id" element={<MachineDetails />} />
      <Route path="/workers" element={<Workers />} />
      <Route path="/workers/profile" element={<ProtectedRoute><RoleGuard allowedRoles={['worker']}><WorkerProfile /></RoleGuard></ProtectedRoute>} />
      <Route path="/workers/:id" element={<WorkerDetails />} />
      <Route path="/tankers" element={<Tankers />} />
      <Route path="/tankers/profile" element={<ProtectedRoute><TankerProfile /></ProtectedRoute>} />
      <Route path="/tankers/:id" element={<TankerDetails />} />
      <Route path="/materials" element={<Materials />} />
      <Route path="/materials/profile" element={<ProtectedRoute><MaterialProfile /></ProtectedRoute>} />

<Route path="/materials/:id" element={<MaterialDetails />} />
      <Route path="/projects" element={<ProtectedRoute><ProjectCart /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
      <Route path="/bookings/requests" element={<ProtectedRoute><BookingRequests /></ProtectedRoute>} />
      <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
