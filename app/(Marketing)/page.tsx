

import EffectCards from '@/components/card/effect-cards';
import Hero from './components/hero';
import Companies from '@/components/companies/companies';
import Timelines from '@/components/changelog/changelog';
import FeaturesGrid from './components/Feature-grid/Features-grids';
import {BlazePerformanceCharts} from '@/components/charts/main/components/recharts-hle';
import Footer from '@/components/Footer/footer';
import Container from '@/components/global/Contanier';


// import Neuronthree from './components/THREE/component';


export default function Home() {




  return (
    <div >
      <main className="flex flex-col min-h-screen font-serif transition-colors duration-300">
       <Hero/>
<Companies/>

{/* <EffectCards/> Consuming more javascript at bundle time  */}
<Timelines/>
<FeaturesGrid/>
<BlazePerformanceCharts/>


<Container delay={0.1}>
        <section className="bg-gradient-to-r from-blue-700 to-blue-900 px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 font-bold text-white text-4xl">Ready to Transform Your Research?</h2>
            <p className="mb-8 text-blue-100 text-xl">Join thousands of researchers who&apos;ve already revolutionized their discovery process with Blaze.</p>
            <div className="flex sm:flex-row flex-col justify-center gap-4">
              <button className="bg-white hover:bg-blue-50 shadow-lg px-8 py-4 rounded-lg font-medium text-blue-800 text-lg transition-colors">
                Start Free Trial
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 border border-blue-400 rounded-lg font-medium text-white text-lg transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </section>
        </Container>

        <Footer/>
      </main>
    </div>
  );
}