import React, { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { WavyBackground } from '../../components/ui/wavy-background'
import { Navigation } from '../components/Navigation'

export function HeroSection() {
    const sectionRef = useRef<HTMLElement>(null)
    useScrollReveal(sectionRef)

    return (
        <section
            ref={sectionRef}
            id="hero"
            className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col items-center overflow-hidden bg-[#f7f7f9]"
        >
            <Navigation />
            <WavyBackground
                containerClassName="h-full min-h-[85vh] md:min-h-[90vh] absolute inset-0 z-0"
                className="w-full flex flex-col items-center"
                colors={["#ffe2de", "#dadada", "#a5c9ff"]}
                backgroundFill="#f7f7f9"
                waveOpacity={0.8}
                blur={8}
                speed="fast"
            >
                <div className="relative z-10 w-full max-w-5xl px-6 pt-24 pb-12 md:pt-32 md:pb-16">
                    <div className="flex flex-col items-center gap-6 md:gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <h1 className="reveal-fade font-redhat font-bold text-[#1f2937] text-[clamp(2.5rem,7vw,5rem)] leading-[1.2]">
                                A Workforce<br />
                                <span className="font-satisfy text-[1.3em] bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent px-2 py-2 leading-none inline-block align-middle whitespace-nowrap">Intelligence Platform</span><br />
                                <span className="whitespace-nowrap">for Scaling Organizations</span>
                            </h1>

                            <p className="reveal-fade text-lg md:text-xl text-[#6b7280] font-redhat font-normal mt-4 max-w-2xl mx-auto leading-relaxed">
                                Gain real-time visibility into hiring needs, team capacity, performance, and retention so leaders can make confident workforce decisions as the organization scales.
                            </p>
                        </div>

                        <div className="reveal-fade flex justify-center">
                            <a
                                href="#cta"
                                className="bg-[#3b82f6] text-white px-10 py-4 rounded-full font-redhat font-bold text-lg tracking-wide hover:bg-[#2563eb] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-3 group"
                            >
                                Request a Demo
                                <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                            </a>
                        </div>
                    </div>
                </div>
            </WavyBackground>
        </section>
    )
}
