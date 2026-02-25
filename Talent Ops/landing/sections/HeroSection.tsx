import React, { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { Navigation } from '../components/Navigation'
import { GlowButton } from '../components/GlowButton'
import { WavyBackground } from '@/components/ui/wavy-background'

export function HeroSection() {
    const sectionRef = useRef<HTMLElement>(null)
    useScrollReveal(sectionRef)

    return (
        <section
            ref={sectionRef}
            id="hero"
            className="relative min-h-[95vh] md:min-h-[100vh] flex flex-col items-center overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #000000 0%, #121212 50%, #FFFFFF 100%)'
            }}
        >
            <Navigation />
            {/* Glassmorphism Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                }}
            />
            <div className="w-full flex-1 flex flex-col items-center justify-center relative z-10 transition-colors duration-500">
                <WavyBackground
                    className="w-full max-w-5xl px-6 pt-24 pb-12 md:pt-32 md:pb-16"
                    containerClassName="absolute inset-0 h-full w-full"
                    colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
                    waveOpacity={0.5}
                    blur={10}
                    speed="fast"
                >
                    <div className="flex flex-col items-center gap-6 md:gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <h1 className="reveal-fade font-display font-medium text-white text-[clamp(2.5rem,7vw,5rem)] leading-[1.1] flex flex-col items-center">
                                <span className="block">A Workforce</span>
                                <span className="block">Intelligence Platform</span>
                                <span className="text-[0.9em] block">for Scaling Organizations</span>
                            </h1>

                            <p className="reveal-fade text-lg md:text-xl text-white/90 font-display font-normal mt-6 max-w-2xl mx-auto leading-relaxed">
                                Gain real-time visibility into hiring needs, team capacity, performance, and retention so leaders can make confident workforce decisions as the organization scales.
                            </p>
                        </div>

                        <div className="reveal-fade flex justify-center">
                            <GlowButton
                                href="#cta"
                                label="Request a Demo"
                            />
                        </div>
                    </div>
                </WavyBackground>
            </div>
        </section>
    )
}
