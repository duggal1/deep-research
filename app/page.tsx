
import Spline from '@splinetool/react-spline/next';


export default function Home() {

  return (
    <div >
      <main className="flex flex-col bg-white dark:bg-black min-h-screen font-serif transition-colors duration-300">
        {/* Navigation */}
        <nav className="z-50 fixed bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-100 dark:border-gray-800 border-b w-full">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-2xl">Blaze</span>
              </div>
              <div className="flex items-center space-x-6">
                <a href="#features" className="text-gray-800 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-200 transition-colors">Features</a>
                <a href="#about" className="text-gray-800 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-200 transition-colors">About</a>
                <a href="#pricing" className="text-gray-800 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-200 transition-colors">Pricing</a>
                {/* <button 
                  onClick={toggleDarkMode}
                  className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-800 dark:text-gray-200"
                >
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button> */}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="flex lg:flex-row flex-col justify-between items-center mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 max-w-7xl">
          <div className="mb-16 lg:mb-0 lg:w-1/2">
            <h1 className="mb-6 font-bold text-gray-900 dark:text-white text-5xl lg:text-6xl leading-tight">
              Illuminate Your <span className="text-blue-600 dark:text-blue-400">Research</span> with Blaze
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
              The next-generation deep research engine that transforms complex queries into actionable insights with unprecedented accuracy and depth.
            </p>
            <div className="flex sm:flex-row flex-col gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-600/20 shadow-lg dark:shadow-blue-500/20 px-8 py-4 rounded-lg font-medium text-white text-lg transition-colors">
                Get Started
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-8 py-4 rounded-lg font-medium text-gray-900 dark:text-white text-lg transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
          <div className="relative w-full lg:w-1/2 h-96">
            <Spline scene="https://prod.spline.design/r2HG5q1DFCvND-2T/scene.splinecode" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-16 font-bold text-gray-900 dark:text-white text-4xl text-center">Powerful Features</h2>
            <div className="gap-8 grid md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Neural Comprehension</h3>
                <p className="text-gray-600 dark:text-gray-300">Advanced neural networks that understand context, intent, and semantic meaning for more accurate research outcomes.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Precision Filtering</h3>
                <p className="text-gray-600 dark:text-gray-300">Custom filters and parameters that let you narrow down to exactly what you need, eliminating noise and irrelevant data.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Source Authentication</h3>
                <p className="text-gray-600 dark:text-gray-300">Automatic verification of source credibility and fact-checking to ensure your research is built on trustworthy information.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Dynamic Visualization</h3>
                <p className="text-gray-600 dark:text-gray-300">Transform complex data into intuitive visualizations that reveal patterns and insights impossible to see in raw format.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Real-time Processing</h3>
                <p className="text-gray-600 dark:text-gray-300">Lightning-fast analysis of vast datasets with results delivered as you type, keeping you in the flow of discovery.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 rounded-xl transition-shadow">
                <div className="mb-4 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="mb-3 font-bold text-gray-900 dark:text-white text-xl">Enhanced Security</h3>
                <p className="text-gray-600 dark:text-gray-300">End-to-end encryption and privacy controls that keep your research data and findings completely confidential.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Second 3D Model Section */}
        <section className="bg-gradient-to-br from-blue-50 dark:from-gray-900 to-white dark:to-gray-800 px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex lg:flex-row flex-col items-center">
              <div className="relative mb-16 lg:mb-0 w-full lg:w-1/2 h-96">
                <Spline scene="https://prod.spline.design/ENMTmlMkPTRL41GL/scene.splinecode" />
              </div>
              <div className="lg:pl-16 lg:w-1/2">
                <h2 className="mb-6 font-bold text-gray-900 dark:text-white text-4xl">Explore Knowledge Like Never Before</h2>
                <p className="mb-8 text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
                  Blaze doesn&apos;t just search—it understands. Our proprietary TarsLis neural network technology maps connections between information sources, creating a dynamic knowledge landscape that evolves with your research journey.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">10x faster research completion compared to traditional methods</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">Discover connections and insights often missed by human researchers</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">Adaptive learning that continuously improves based on your research focus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-white dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-16 font-bold text-gray-900 dark:text-white text-4xl text-center">What Researchers Say</h2>
            <div className="gap-8 grid md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
                <div className="mb-6 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="mb-6 text-gray-600 dark:text-gray-300">Blaze has completely transformed our academic research process. What used to take weeks now takes days, with more comprehensive results and unexpected insights.</p>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Dr. Sarah Chen</p>
                  <p className="text-gray-600 dark:text-gray-400">Quantum Physics Professor</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
                <div className="mb-6 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="mb-6 text-gray-600 dark:text-gray-300">As a market analyst, the depth and speed of Blaze&lsquo;s research capabilities give our firm a serious competitive edge. The connections it discovers between seemingly unrelated market trends are invaluable.</p>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Marcus Johnson</p>
                  <p className="text-gray-600 dark:text-gray-400">Senior Market Analyst</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
                <div className="mb-6 text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="mb-6 text-gray-600 dark:text-gray-300">Blaze has revolutionized how we approach medical literature reviews. Its ability to connect related studies across disciplines has led to breakthrough insights for our clinical research team.</p>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Dr. Amelia Rodriguez</p>
                  <p className="text-gray-600 dark:text-gray-400">Clinical Research Director</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-16 font-bold text-gray-900 dark:text-white text-4xl text-center">Choose Your Research Power</h2>
            <div className="gap-8 grid md:grid-cols-3">
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 border-gray-200 dark:border-gray-700 border-t-4 rounded-xl transition-shadow">
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-2xl">Explorer</h3>
                <div className="mb-6">
                  <span className="font-bold text-gray-900 dark:text-white text-4xl">$49</span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">50 deep queries per day</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Basic visualization tools</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Standard knowledge graph</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Email support</span>
                  </li>
                </ul>
                <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 py-3 rounded-lg w-full font-medium text-gray-900 dark:text-white transition-colors">
                  Get Started
                </button>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-lg p-8 border-t-4 border-blue-600 dark:border-blue-500 rounded-xl scale-105 transform">
                <div className="-top-5 right-0 left-0 absolute flex justify-center">
                  <span className="bg-blue-600 px-4 py-1 rounded-full text-white text-sm">Most Popular</span>
                </div>
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-2xl">Professional</h3>
                <div className="mb-6">
                  <span className="font-bold text-gray-900 dark:text-white text-4xl">$149</span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Unlimited deep queries</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Advanced visualization suite</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Enhanced knowledge mapping</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Priority support with 24-hour response</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">API access</span>
                  </li>
                </ul>
                <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-600/20 shadow-lg dark:shadow-blue-500/20 py-3 rounded-lg w-full font-medium text-white transition-colors">
                  Get Started
                </button>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg p-8 border-gray-200 dark:border-gray-700 border-t-4 rounded-xl transition-shadow">
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-2xl">Enterprise</h3>
                <div className="mb-6">
                  <span className="font-bold text-gray-900 dark:text-white text-4xl">Custom</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Unlimited everything</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Custom integrations</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Dedicated knowledge engineer</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">24/7 priority support</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Custom deployment options</span>
                  </li>
                </ul>
                <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 py-3 rounded-lg w-full font-medium text-gray-900 dark:text-white transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
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

        {/* Footer */}
        <footer className="bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-12 border-gray-200 dark:border-gray-800 border-t">
          <div className="mx-auto max-w-7xl">
            <div className="gap-8 grid grid-cols-2 md:grid-cols-4">
              <div>
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-lg">Product</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Features</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Pricing</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">API</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Integrations</a></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-lg">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Documentation</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Guides</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Webinars</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Case Studies</a></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-lg">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">About</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Blog</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Careers</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 font-bold text-gray-900 dark:text-white text-lg">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Privacy</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Terms</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">Security</a></li>
                </ul>
              </div>
            </div>
            <div className="flex md:flex-row flex-col justify-between items-center mt-12 pt-8 border-gray-200 dark:border-gray-800 border-t">
              <div className="mb-4 md:mb-0">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-2xl">Blaze</span>
                <p className="mt-2 text-gray-600 dark:text-gray-400">© 2025 Blaze Research, Inc. All rights reserved.</p>
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.03 10.03 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 dark:text-gray-400">
                  <span className="sr-only">GitHub</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}