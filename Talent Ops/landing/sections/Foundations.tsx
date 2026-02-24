import React from 'react';
import { motion } from 'framer-motion';

const points = [
    {
        text: "Designed specifically for ",
        highlight: "small and mid-sized companies",
        after: " where efficiency and speed are critical."
    },
    {
        text: "Reduces cognitive load by ",
        highlight: "consolidating information, workflows, and decision signals",
        after: " into one system."
    },
    {
        text: "Enables a ",
        highlight: "single individual to manage responsibilities",
        after: " that traditionally required multiple roles."
    },
    {
        text: "Helps teams operate with ",
        highlight: "greater clarity, accountability, and control",
        after: " as complexity increases."
    }
];

export default function Foundations() {
    return (
        <section id="foundations" className="py-24 px-6 lg:px-12 bg-white relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[32px] md:text-[40px] lg:text-[46px] text-[#1f2937] font-heading font-semibold tracking-tight leading-[1.2]"
                    >
                        Foundations for Efficient Growth
                    </motion.h2>
                </div>

                <div className="flex flex-col gap-10">
                    {points.map((point, index) => (
                        <motion.div
                            key={index}
                            initial="initial"
                            whileHover="hover"
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.8 }}
                            className="flex items-start gap-8 group"
                        >
                            <motion.div
                                variants={{
                                    initial: {
                                        scale: 1,
                                        backgroundColor: 'transparent',
                                        color: 'rgba(31, 41, 55, 0.2)',
                                        borderColor: 'rgba(218, 218, 218, 0.5)'
                                    },
                                    hover: {
                                        scale: 1.15,
                                        backgroundColor: '#3b82f6',
                                        color: '#ffffff',
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
                                    }
                                }}
                                transition={{ duration: 0.3 }}
                                className="mt-1 w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 text-xl font-heading font-black transition-all cursor-default"
                            >
                                {index + 1}
                            </motion.div>
                            <p className="text-[18px] md:text-[20px] text-[#1f2937]/80 font-serif leading-[1.6] pt-1.5 transition-colors duration-300 group-hover:text-[#1f2937]">
                                {point.text}
                                <span className="text-[#1f2937] font-semibold">
                                    {point.highlight}
                                </span>
                                {point.after}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
