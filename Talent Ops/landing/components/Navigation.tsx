import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Navigation() {
    const [scrolled, setScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLoginClick = () => {
        navigate('/login')
        setIsMobileMenuOpen(false)
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-[10000] transition-all duration-300 font-sans ${scrolled ? 'bg-white border-b border-[#dadada] py-3 shadow-sm' : 'bg-transparent py-4'
                }`}
        >
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <span className="text-xl md:text-2xl font-bold tracking-tighter text-[#1f2937]">
                        Talent<span className="text-[#3b82f6]">Ops</span>
                    </span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex gap-10">
                    {[
                        { name: 'Problem', href: '#problem' },
                        { name: 'Services', href: '#services' },
                        { name: 'How It Works', href: '#approach' },
                        { name: 'Industries', href: '#industries' },
                        { name: 'Results', href: '#results' }
                    ].map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            className="text-[15px] font-redhat font-medium text-[#1f2937]/70 hover:text-[#3b82f6] transition-colors"
                        >
                            {item.name}
                        </a>
                    ))}
                </div>

                {/* Desktop Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={handleLoginClick}
                        className="text-[15px] font-redhat font-bold text-[#1f2937] hover:text-[#3b82f6] transition-colors px-4 py-2"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            const el = document.getElementById('cta');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-[#3b82f6] text-white px-6 py-2.5 rounded-full font-redhat font-bold text-[15px] hover:bg-[#2563eb] transition-all shadow-sm hover:shadow-md"
                    >
                        Request a Demo
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-[#1f2937]"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div className="w-6 h-5 flex flex-col justify-between">
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
                    </div>
                </button>
            </div>

            {/* Mobile Menu Content */}
            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border-b border-[#dadada] flex flex-col p-6 gap-4 md:hidden shadow-xl animate-in fade-in slide-in-from-top-4">
                    {[
                        { name: 'Problem', href: '#problem' },
                        { name: 'Services', href: '#services' },
                        { name: 'How It Works', href: '#approach' },
                        { name: 'Industries', href: '#industries' },
                        { name: 'Results', href: '#results' }
                    ].map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            className="text-lg font-semibold text-[#1f2937]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {item.name}
                        </a>
                    ))}
                    <div className="flex flex-col gap-4 pt-4 border-t border-[#dadada]">
                        <button onClick={handleLoginClick} className="text-lg font-semibold text-left text-[#1f2937]">Sign In</button>
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                const el = document.getElementById('cta');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-[#3b82f6] text-white px-6 py-3 rounded-xl font-redhat font-bold text-center"
                        >
                            Request a Demo
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
