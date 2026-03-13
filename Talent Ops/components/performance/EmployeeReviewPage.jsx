import React, { useState, useEffect } from 'react';
// @ts-ignore
import RankingTab from './components/RankingTab';
import { supabase } from '../../lib/supabaseClient';
import { Save, Brain, Heart, Sparkles, Loader2, CheckCircle2, AlertCircle, User, Users, Trophy, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import Leaderboard from './components/Leaderboard';

const ReviewPage = () => {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [userId, setUserId] = useState(null);
    const [activeTab, setActiveTab] = useState('self'); // 'self' or 'manager'
    const [reviewData, setReviewData] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const devSkillsList = [
        "Frontend", "Backend", "Workflows", "Databases", "Prompting",
        "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
    ];

    const softTraitsList = [
        "Accountability", "Compliance", "Learnability", "Ambitious",
        "Abstract Thinking", "Communication", "Curiosity", "English",
        "Second-Order Thinking", "First-Principle Thinking"
    ];

    const [devScores, setDevScores] = useState({});
    const [softScores, setSoftScores] = useState({});

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                setCurrentUserProfile(user);
                fetchReview(user.id, selectedMonth, selectedYear);
            }
        };
        fetchUserData();
    }, [selectedMonth, selectedYear]);

    const fetchReview = async (uid, month, year) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employee_reviews')
                .select('*')
                .eq('user_id', uid)
                .eq('review_month', month)
                .eq('review_year', year)
                .maybeSingle();

            if (data) {
                setReviewData(data);

                if (data.development_skills && Object.keys(data.development_skills).length > 0) {
                    setDevScores(data.development_skills);
                } else {
                    const initialDev = {};
                    devSkillsList.forEach(skill => initialDev[skill] = 5);
                    setDevScores(initialDev);
                }

                if (data.soft_skills && Object.keys(data.soft_skills).length > 0) {
                    setSoftScores(data.soft_skills);
                } else {
                    const initialSoft = {};
                    softTraitsList.forEach(trait => initialSoft[trait] = 5);
                    setSoftScores(initialSoft);
                }
            } else {
                setReviewData(null);
                // Initialize default scores
                const initialDev = {};
                devSkillsList.forEach(skill => initialDev[skill] = 5);
                setDevScores(initialDev);

                const initialSoft = {};
                softTraitsList.forEach(trait => initialSoft[trait] = 5);
                setSoftScores(initialSoft);
            }
        } catch (error) {
            console.error('Error fetching review:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDevChange = (skill, value) => {
        setDevScores(prev => ({ ...prev, [skill]: parseFloat(value) }));
    };

    const handleSoftChange = (trait, value) => {
        setSoftScores(prev => ({ ...prev, [trait]: parseFloat(value) }));
    };

    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // First check if a record already exists to retain other fields if they exist
            const { data: existingData } = await supabase
                .from('employee_reviews')
                .select('id')
                .eq('user_id', userId)
                .eq('review_month', selectedMonth)
                .eq('review_year', selectedYear)
                .maybeSingle();

            let error;

            if (existingData?.id) {
                const { error: updateError } = await supabase
                    .from('employee_reviews')
                    .update({
                        development_skills: devScores,
                        soft_skills: softScores,
                    })
                    .eq('id', existingData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('employee_reviews')
                    .insert({
                        user_id: userId,
                        review_month: selectedMonth,
                        review_year: selectedYear,
                        development_skills: devScores,
                        soft_skills: softScores,
                    });
                error = insertError;
            }

            if (error) throw error;

            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
            fetchReview(userId, selectedMonth, selectedYear); // Refresh data
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Failed to save review. Please try again. Detailed error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 5) return 'text-accent-violet bg-violet-50 border-violet-100';
        return 'text-amber-600 bg-amber-50 border-amber-100';
    };

    const getScoreLabel = (score) => {
        if (score >= 9) return 'Expert';
        if (score >= 7) return 'Advanced';
        if (score >= 5) return 'Competent';
        if (score >= 3) return 'Novice';
        return 'Beginner';
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const renderSelfAssessment = () => (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
            {/* Development Skills Section */}
            <motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-sm border border-mist relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-mist">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-body font-medium text-ink">Development Skills</h2>
                        <p className="text-sm text-graphite-light">Rate your technical capabilities</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {devSkillsList.map((skill) => (
                        <div key={skill} className="space-y-3">
                            <div className="flex justify-between items-end relative">
                                <label className="text-graphite font-medium text-sm tracking-wide">{skill}</label>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(devScores[skill])}`}>
                                    {devScores[skill]} / 10 • {getScoreLabel(devScores[skill])}
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={devScores[skill] || 0}
                                    onChange={(e) => {
                                        let val = parseFloat(e.target.value);
                                        if (val > 10) val = 10;
                                        if (val < 0) val = 0;
                                        handleDevChange(skill, val || 0)
                                    }}
                                    disabled={reviewData?.is_locked}
                                    className={`absolute right-0 -top-8 w-16 px-2 py-1 text-center text-sm border rounded-lg z-30 bg-white ${reviewData?.is_locked ? 'cursor-not-allowed bg-gray-50' : 'cursor-text focus:outline-none focus:ring-1 focus:ring-accent-violet'}`}
                                />
                            </div>

                            {/* Visual Progress Bar (Interactive if not submitted) */}
                            <div className="relative h-2 w-full bg-mist rounded-full overflow-hidden mt-1">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={devScores[skill] || 5}
                                    onChange={(e) => handleDevChange(skill, e.target.value)}
                                    disabled={reviewData?.is_locked}
                                    className={`absolute top-0 left-0 w-full h-full opacity-0 z-20 ${reviewData?.is_locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                />
                                <div
                                    className="absolute top-0 left-0 h-full bg-accent-violet transition-all duration-300 rounded-full z-10"
                                    style={{ width: `${((devScores[skill] || 0) / 10) * 100}%` }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 1px', marginTop: '2px' }}>
                                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((val) => (
                                    <div key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '5%' }}>
                                        <div style={{ width: '1px', height: val % 1 === 0 ? '6px' : '3px', backgroundColor: val % 1 === 0 ? '#94a3b8' : '#cbd5e1' }} />
                                        {val % 1 === 0 && (
                                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px', fontWeight: '500' }}>{val}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div >

            {/* Soft Traits Section */}
            < motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-sm border border-mist relative overflow-hidden" >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-mist">
                    <div className="p-2 rounded-lg bg-pink-50 text-pink-500">
                        <Heart className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-body font-medium text-ink">Soft Traits</h2>
                        <p className="text-sm text-graphite-light">Rate your behavioral competencies</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {softTraitsList.map((trait) => (
                        <div key={trait} className="space-y-3">
                            <div className="flex justify-between items-end relative">
                                <label className="text-graphite font-medium text-sm tracking-wide">{trait}</label>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(softScores[trait])}`}>
                                    {softScores[trait]} / 10 • {getScoreLabel(softScores[trait])}
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={softScores[trait] || 0}
                                    onChange={(e) => {
                                        let val = parseFloat(e.target.value);
                                        if (val > 10) val = 10;
                                        if (val < 0) val = 0;
                                        handleSoftChange(trait, val || 0)
                                    }}
                                    disabled={reviewData?.is_locked}
                                    className={`absolute right-0 -top-8 w-16 px-2 py-1 text-center text-sm border rounded-lg z-30 bg-white ${reviewData?.is_locked ? 'cursor-not-allowed bg-gray-50' : 'cursor-text focus:outline-none focus:ring-1 focus:ring-accent-violet'}`}
                                />
                            </div>
                            <div className="relative h-2 w-full bg-mist rounded-full overflow-hidden mt-1">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={softScores[trait] || 5}
                                    onChange={(e) => handleSoftChange(trait, e.target.value)}
                                    disabled={reviewData?.is_locked}
                                    className={`absolute top-0 left-0 w-full h-full opacity-0 z-20 ${reviewData?.is_locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                />
                                <div
                                    className="absolute top-0 left-0 h-full bg-pink-500 transition-all duration-300 rounded-full z-10"
                                    style={{ width: `${((softScores[trait] || 0) / 10) * 100}%` }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 1px', marginTop: '2px' }}>
                                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((val) => (
                                    <div key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '5%' }}>
                                        <div style={{ width: '1px', height: val % 1 === 0 ? '6px' : '3px', backgroundColor: val % 1 === 0 ? '#94a3b8' : '#cbd5e1' }} />
                                        {val % 1 === 0 && (
                                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px', fontWeight: '500' }}>{val}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div >
        </motion.div >
    );

    const renderManagerReview = () => {
        if (!reviewData?.manager_development_skills) {
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-mist border-dashed">
                    <div className="w-16 h-16 bg-mist/30 text-graphite-light rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-ink">No Manager Review Yet</h3>
                    <p className="text-graphite-light text-center max-w-sm mt-2">
                        Your manager has not submitted a performance review for you yet. Please check back later or request a review.
                    </p>
                </div>
            );
        }

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
                {/* Manager Dev Skills */}
                <motion.div variants={itemVariants} className="md:col-span-2">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg mb-8">
                        <h2 className="text-lg font-medium opacity-90 mb-6 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            Performance Score Card
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-sm opacity-70 mb-1">Technical Score</div>
                                <div className="text-2xl font-bold font-body">
                                    {reviewData.manager_score_dev || 0}
                                    <span className="text-sm font-normal opacity-60 ml-1">/90</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-sm opacity-70 mb-1">Behavioral Score</div>
                                <div className="text-2xl font-bold font-body">
                                    {reviewData.manager_score_soft || 0}
                                    <span className="text-sm font-normal opacity-60 ml-1">/100</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="text-sm opacity-70 mb-1">Total Score</div>
                                <div className="text-3xl font-bold font-body text-yellow-300">
                                    {reviewData.manager_score_total || 0}
                                    <span className="text-sm font-normal text-white opacity-60 ml-1">/190</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-sm opacity-70 mb-1">Percentage</div>
                                <div className="text-2xl font-bold font-body">
                                    {reviewData.manager_score_percentage || 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-sm border border-mist relative">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-mist">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-body font-medium text-ink">Technical Assessment</h2>
                            <p className="text-sm text-graphite-light">Manager's rating of your skills</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {devSkillsList.map((skill) => {
                            const score = reviewData.manager_development_skills[skill] || 0;
                            const selfScore = devScores[skill] || 0;
                            return (
                                <div key={skill} className="p-4 bg-paper rounded-xl border border-mist/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="text-graphite font-medium">{skill}</label>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreColor(score)}`}>
                                            {score}/10
                                        </div>
                                    </div>
                                    <div className="relative h-2 w-full bg-mist rounded-full overflow-hidden mb-2">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${(score / 10) * 100}%` }}
                                        />
                                        {/* Marker for self score comparison */}
                                        <div
                                            className="absolute top-0 w-1 h-full bg-black/30 z-20"
                                            style={{ left: `${(selfScore / 10) * 100}%` }}
                                            title={`Your rating: ${selfScore}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-graphite-light">
                                        <span>Manager Rating</span>
                                        <span>Your Rating: {selfScore}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Manager Soft Skills */}
                <motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-sm border border-mist relative">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-mist">
                        <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-body font-medium text-ink">Behavioral Assessment</h2>
                            <p className="text-sm text-graphite-light">Manager's rating of your traits</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {softTraitsList.map((trait) => {
                            const score = reviewData.manager_soft_skills[trait] || 0;
                            const selfScore = softScores[trait] || 0;
                            return (
                                <div key={trait} className="p-4 bg-paper rounded-xl border border-mist/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="text-graphite font-medium">{trait}</label>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreColor(score)}`}>
                                            {score}/10
                                        </div>
                                    </div>
                                    <div className="relative h-2 w-full bg-mist rounded-full overflow-hidden mb-2">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-rose-500 rounded-full"
                                            style={{ width: `${(score / 10) * 100}%` }}
                                        />
                                        <div
                                            className="absolute top-0 w-1 h-full bg-black/30 z-20"
                                            style={{ left: `${(selfScore / 10) * 100}%` }}
                                            title={`Your rating: ${selfScore}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-graphite-light">
                                        <span>Manager Rating</span>
                                        <span>Your Rating: {selfScore}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Feedback Section */}
                {reviewData.manager_feedback && (
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-mist">
                        <h3 className="text-lg font-medium text-ink mb-4">Manager's Feedback</h3>
                        <div className="p-6 bg-paper rounded-xl border border-mist text-graphite italic leading-relaxed">
                            "{reviewData.manager_feedback}"
                        </div>
                    </motion.div>
                )}

                {/* Executive Remarks Section */}
                {reviewData.executive_remarks && (
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-mist border-l-4 border-l-accent-violet">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-lg font-medium text-ink">Executive Remarks</h3>
                            <span className="px-2 py-0.5 bg-violet-100 text-accent-violet text-[10px] font-bold uppercase tracking-wider rounded">Leadership</span>
                        </div>
                        <div className="p-6 bg-paper rounded-xl border border-mist text-graphite italic leading-relaxed">
                            "{reviewData.executive_remarks}"
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-paper font-body p-6 pb-24">
            {/* Compact Header - Matching Leave Requests Style */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '8px',
                padding: '20px 28px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                marginBottom: '20px'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>/</span>
                            <span style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Performance Review</span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                            Performance Review
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: '400' }}>
                            Track your growth through self-reflection and manager feedback.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Month/Year Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <Calendar className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                style={{ background: 'transparent', color: 'white', fontSize: '0.85rem', fontWeight: '500', border: 'none', outline: 'none', cursor: 'pointer' }}
                            >
                                {[
                                    "January", "February", "March", "April", "May", "June",
                                    "July", "August", "September", "October", "November", "December"
                                ].map((month, idx) => (
                                    <option key={idx} value={idx + 1} style={{ color: '#0f172a' }}>{month}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                style={{ background: 'transparent', color: 'white', fontSize: '0.85rem', fontWeight: '500', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value={2024} style={{ color: '#0f172a' }}>2024</option>
                                <option value={2025} style={{ color: '#0f172a' }}>2025</option>
                                <option value={2026} style={{ color: '#0f172a' }}>2026</option>
                            </select>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                onClick={() => setActiveTab('self')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px', borderRadius: '6px', border: 'none',
                                    backgroundColor: activeTab === 'self' ? 'rgba(139,92,246,0.9)' : 'transparent',
                                    color: activeTab === 'self' ? 'white' : 'rgba(255,255,255,0.6)',
                                    fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <User className="w-4 h-4" />
                                Self Assessment
                            </button>
                            <button
                                onClick={() => setActiveTab('manager')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px', borderRadius: '6px', border: 'none',
                                    backgroundColor: activeTab === 'manager' ? 'rgba(139,92,246,0.9)' : 'transparent',
                                    color: activeTab === 'manager' ? 'white' : 'rgba(255,255,255,0.6)',
                                    fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <Users className="w-4 h-4" />
                                Manager Review
                            </button>
                            <button
                                onClick={() => setActiveTab('ranking')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 14px', borderRadius: '6px', border: 'none',
                                    backgroundColor: activeTab === 'ranking' ? 'rgba(139,92,246,0.9)' : 'transparent',
                                    color: activeTab === 'ranking' ? 'white' : 'rgba(255,255,255,0.6)',
                                    fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <Trophy className="w-4 h-4" />
                                Ranking
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {activeTab === 'self' ? (
                    <motion.div
                        key="self"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderSelfAssessment()}

                        {/* Footer / Submit Section (Only for Self) */}
                        <motion.div
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="mt-8 flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-mist"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-accent-violet mt-0.5" />
                                <div>
                                    {reviewData?.is_locked ? (
                                        <>
                                            <h3 className="text-sm font-semibold text-ink">Assessment Locked</h3>
                                            <p className="text-sm text-graphite-light max-w-lg">
                                                The review for this month has been finalized and locked by your manager.
                                            </p>
                                        </>
                                    ) : reviewData?.development_skills ? (
                                        <>
                                            <h3 className="text-sm font-semibold text-ink">Update Assessment?</h3>
                                            <p className="text-sm text-graphite-light max-w-lg">
                                                You have already submitted your self-assessment for this month. You can still update it until it is finalized.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-sm font-semibold text-ink">Ready to Submit?</h3>
                                            <p className="text-sm text-graphite-light max-w-lg">
                                                Please ensure all ratings accurately reflect your current capabilities.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {reviewData?.is_locked ? (
                                <div className="px-6 py-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 cursor-default font-medium text-sm">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Finalized
                                </div>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || submitted}
                                    className={`
                                        relative px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-sm
                                        ${submitted
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                            : 'bg-accent-violet hover:bg-accent-violet-deep text-white shadow-md hover:shadow-lg active:scale-95'
                                        }
                                        disabled:opacity-70 disabled:cursor-not-allowed
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : submitted ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Assessment Saved
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Submit Assessment
                                        </>
                                    )}
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                ) : activeTab === 'manager' ? (
                    <motion.div
                        key="manager"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderManagerReview()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="ranking"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <RankingTab currentUserProfile={currentUserProfile} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ReviewPage;
