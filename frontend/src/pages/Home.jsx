import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { CategorySection, HeroSection, HowItWorks, ProviderCTA, TrustSection } from '../components/HomeSections'

export default function Home() {
  return <div className="site-page"><Navbar /><main><HeroSection /><CategorySection /><HowItWorks /><ProviderCTA /><TrustSection /></main><Footer /></div>
}
