import React from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const services = [
    {
        title: 'Team Structure Design',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200',
        description: 'We build clear frameworks for hiring, managing, and keeping talent that can scale from 10 to 100 people without friction.',
        features: [
            'Role Architecture & Org Mapping',
            'Optimized Hiring Workflows',
            'Unified Onboarding Systems',
            'Career Path Frameworks'
        ]
    },
    {
        title: 'Performance Systems',
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1200',
        description: 'Move from intuition to intelligence. We help you set clear goals and implement robust feedback loops that drive growth.',
        features: [
            'Evidence-Based Reviews',
            'OKR & KPI Alignment',
            'Manager Capability Training',
            'Cross-Team Productivity Audits'
        ]
    },
    {
        title: 'People Data & Strategy',
        image: '/people-data-stretagy.jpg.png',
        description: 'Leverage predictive analytics to understand sentiment, retention risks, and surface hidden growth potential in your team.',
        features: [
            'Team Health Diagnostics',
            'Attrition Risk Modeling',
            'Succession Visualization',
            'Performance Trend Analysis'
        ]
    }
];

function ServiceFlipCard({ service, index }: { service: typeof services[0], index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
            className="group h-[480px] w-full [perspective:1000px]"
        >
            <div className="relative h-full w-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

                {/* Front Side */}
                <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[32px] bg-[#0A0A0B] border border-mist/40 [backface-visibility:hidden] flex flex-col">
                    {/* Top Image - Height 240px */}
                    <div className="relative h-[240px] w-full overflow-hidden">
                        <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    </div>

                    {/* Front Content - Just the heading */}
                    <div className="p-8 md:p-10 flex flex-col items-center justify-center flex-grow">
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-white text-center">
                            {service.title}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                            Hover to Flip <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[32px] bg-[#0A0A0B] border border-[#E6D3C4]/20 p-10 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <h3 className="text-2xl font-display font-bold text-[#FFEEDE] mb-6 border-b border-[#E6D3C4]/20 pb-4 text-left">
                        {service.title}
                    </h3>

                    <p className="text-[#E6D3C4]/80 font-elegant text-lg mb-8 leading-relaxed text-left">
                        {service.description}
                    </p>

                    <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar">
                        {service.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm text-[#E6D3C4]/70 font-medium font-elegant text-left">
                                <CheckCircle2 className="w-5 h-5 text-[#FFEEDE]/40 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-auto border-t border-[#E6D3C4]/10">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFEEDE]/40">
                            Strategy & Execution
                        </span>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

export default function Services() {
    return (
        <section
            id="services"
            className="py-16 md:py-24 px-6 lg:px-12 bg-[#0A0A0B] relative overflow-hidden flex flex-col justify-center"
        >
            <div className="max-w-7xl mx-auto relative z-10 w-full">
                <div className="text-center mb-24 md:mb-32 max-w-4xl mx-auto">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6 }}
                        className="inline-block font-accent text-xs font-bold tracking-[0.4em] uppercase text-[#E6D3C4] mb-8"
                    >
                        OUR CAPABILITIES
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-[#FFEEDE] mb-10 leading-[1.1] tracking-tight"
                    >
                        The Intelligence Layer for <br className="hidden md:block" />
                        <span className="text-[#E6D3C4] italic">High-Performance</span> Teams
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-xl text-[#E6D3C4]/60 font-elegant leading-relaxed max-w-3xl mx-auto font-light"
                    >
                        We don't just advise. We implement the execution systems, data loops, and structure required to transform talent into measurable business outcomes.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full">
                    {services.map((service, index) => (
                        <ServiceFlipCard key={index} service={service} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
