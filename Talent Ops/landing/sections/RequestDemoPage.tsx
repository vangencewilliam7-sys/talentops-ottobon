import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Building2, Mail, User, Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function RequestDemoPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const fromSection = (location.state as any)?.from || null;

    const handleReturnHome = () => {
        navigate('/', { state: { scrollTo: fromSection } });
    };
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Full name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Work email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid work email';
        }
        if (!formData.company.trim()) newErrors.company = 'Company name is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-12 rounded-[32px] shadow-xl border border-[#dadada] max-w-xl w-full text-center"
                >
                    <div className="w-20 h-20 bg-[#f0f9ff] rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-10 h-10 text-[#3b82f6]" />
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-[#1f2937] mb-4">Request Received</h1>
                    <p className="text-lg text-[#1f2937]/70 font-serif leading-relaxed mb-10">
                        Thank you for your interest in TalentOps. One of our workforce intelligence experts will reach out to you within 24 hours to schedule your personalized demo.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mx-auto max-w-md">
                        <button
                            onClick={() => navigate('/onboarding')}
                            className="w-full bg-[#3b82f6] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2563eb] transition-all shadow-lg shadow-[#3b82f6]/20"
                        >
                            Complete Workspace Setup <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleReturnHome}
                            className="w-full bg-white text-[#1f2937] border border-[#dadada] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#F8F7F4] transition-colors"
                        >
                            Return Home
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#F8F7F4] flex flex-col relative px-6 md:px-12 py-4 overflow-hidden">
            <main className="flex-grow flex items-center justify-center py-6">
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left side: Context */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-[#3b82f6] font-bold tracking-[0.2em] uppercase text-xs mb-3 block">Request a Demo</span>
                        <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#1f2937] leading-[1.1] mb-6">
                            See TalentOps in Action
                        </h1>
                        <p className="text-lg text-[#1f2937]/70 font-serif leading-relaxed mb-6 max-w-lg">
                            Discover how our workforce intelligence platform can help you structure growth, optimize performance, and build a high-ROI workforce.
                        </p>

                        <div className="space-y-4">
                            {[
                                "Personalized walkthrough of key features",
                                "Custom ROI analysis for your team",
                                "Deep dive into data integrations",
                                "Answers to your specific technical questions"
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-[#1f2937]">
                                    <div className="w-5 h-5 rounded-full bg-[#f0f9ff] flex items-center justify-center">
                                        <ChevronRight className="w-3 h-3 text-[#3b82f6]" />
                                    </div>
                                    <span className="font-serif font-medium text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right side: Redirect CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-white p-10 md:p-14 rounded-[40px] shadow-2xl border border-[#dadada] flex flex-col items-center text-center"
                    >
                        <div className="w-20 h-20 bg-[#f0f9ff] rounded-[24px] flex items-center justify-center mb-8 rotate-3">
                            <Building2 className="w-10 h-10 text-[#3b82f6]" />
                        </div>
                        
                        <h2 className="text-3xl font-heading font-bold text-[#1f2937] mb-4">
                            Ready to build your workspace?
                        </h2>
                        <p className="text-[#1f2937]/60 font-serif mb-10 text-lg leading-relaxed">
                            Skip the wait and start configuring your workforce intelligence environment immediately through our automated onboarding wizard.
                        </p>

                        <button
                            onClick={() => navigate('/onboarding')}
                            className="w-full bg-[#3b82f6] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[#2563eb] transition-all shadow-2xl shadow-[#3b82f6]/30 flex items-center justify-center gap-3 group"
                        >
                            Start Setup Now
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <p className="mt-6 text-[11px] text-[#1f2937]/30 font-serif uppercase tracking-widest">
                            No credit card required • Instant Access
                        </p>
                    </motion.div>
                </div>
            </main>

            {/* Bottom Left Back Link */}
            <div className="absolute bottom-8 left-8 md:left-12">
                <button onClick={handleReturnHome} className="inline-flex items-center gap-2 text-[#1f2937]/80 hover:text-[#3b82f6] transition-colors font-bold group text-sm">
                    <div className="w-7 h-7 rounded-full bg-white border border-[#dadada] flex items-center justify-center group-hover:bg-[#3b82f6] group-hover:border-[#3b82f6] group-hover:text-white transition-all">
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                    Back to Home
                </button>
            </div>
        </div>
    );
}
