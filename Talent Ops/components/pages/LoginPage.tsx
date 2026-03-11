import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';


export const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', username);

        try {
            console.log('Attempting authentication...');
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });

            if (error) {
                console.error('❌ Authentication failed:', error);
                setError(error.message);
                return;
            }

            console.log('✅ Authentication successful');

            if (data.user) {
                // Check if user profile exists in the database
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile) {
                    console.error('❌ No profile found for user');
                    await supabase.auth.signOut();
                    setError('Your account is not registered in the system. Please contact your administrator.');
                    return;
                }

                // Get role from profile
                let role = profile.role;

                if (!role) {
                    console.error('❌ No role assigned to profile');
                    await supabase.auth.signOut();
                    setError('Your account does not have a role assigned. Please contact your administrator.');
                    return;
                }

                const normalizedRole = role.toLowerCase().trim();

                switch (normalizedRole) {
                    case 'executive':
                    case 'admin':
                        navigate('/executive-dashboard');
                        break;
                    case 'super_admin':
                        navigate('/super-admin');
                        break;
                    case 'manager':
                        navigate('/manager-dashboard');
                        break;
                    case 'team_lead':
                        navigate('/teamlead-dashboard');
                        break;
                    case 'employee':
                        navigate('/employee-dashboard');
                        break;
                    default:
                        console.error('❌ Invalid role:', normalizedRole);
                        await supabase.auth.signOut();
                        setError(`Invalid role assigned to your account: "${role}". Please contact your administrator.`);
                }
            }
        } catch (err) {
            console.error('❌ Unexpected error during login:', err);
            setError('An unexpected error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Decorative SVGs to match the vibe */}
            <div className="absolute left-[8%] top-[50%] -translate-y-[50%] hidden lg:block pointer-events-none">
                {/* Dotted yellowish box */}
                <div className="w-28 h-56 bg-[#fde6a2] rounded-sm relative shadow-sm border-[1.5px] border-gray-900" style={{ backgroundImage: 'radial-gradient(circle, #111827 2px, transparent 2px)', backgroundSize: '24px 24px', backgroundPosition: 'center' }}></div>

                {/* SVGs & small details */}
                <svg className="absolute -top-24 -left-12 w-48 h-48 text-gray-800" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10,80 Q30,10 60,50 T90,20" />
                    <circle cx="85" cy="15" r="2" fill="none" />
                    <rect x="30" y="60" width="40" height="30" fill="none" />
                    <path d="M40,70 h20 M40,80 h15" fill="none" strokeWidth="1" />
                </svg>

                <div className="absolute top-1/2 -right-36 w-24 h-28 bg-white border-[1.5px] border-gray-900 flex items-center justify-center rounded-sm">
                    <svg className="w-10 h-10 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </div>

                <svg className="absolute -bottom-10 -right-20 w-32 h-32 text-gray-800" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10,10 Q20,30 40,20 T70,50" />
                </svg>
            </div>

            {/* Right side background elements */}
            <div className="absolute right-[12%] top-[45%] hidden lg:block pointer-events-none">
                <div className="w-24 h-48 bg-[#fbc485] rounded-sm relative shadow-sm border-[1.5px] border-gray-900 mt-20" style={{ backgroundImage: 'radial-gradient(circle, #111827 2px, transparent 2px)', backgroundSize: '20px 20px', backgroundPosition: 'center' }}></div>
                <svg className="absolute -top-32 -right-16 w-56 h-56 text-gray-800" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="1.5">
                    <path d="M0,50 Q20,80 50,40 T90,60" />
                    <circle cx="95" cy="55" r="2" fill="none" />
                    <rect x="10" y="10" width="35" height="25" fill="none" />
                    <path d="M15,20 h20 M15,28 h12" fill="none" strokeWidth="1" />
                </svg>

                {/* Additional floating cube */}
                <div className="absolute top-0 -left-20 w-32 h-32 bg-white border-[1.5px] border-gray-900 rounded-sm"></div>
            </div>

            <svg className="absolute top-16 right-1/4 w-32 h-32 text-gray-800 hidden lg:block pointer-events-none" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="1.5">
                <path d="M10,50 Q20,30 30,50 T50,50 T70,50" />
            </svg>

            {/* Main Login Card */}
            <div className="w-full max-w-[420px] relative z-10 mx-auto">
                <div className="bg-white rounded-[32px] p-10 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
                    <div className="text-center mb-8">
                        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight mb-2">TalentOps</h2>
                        <p className="text-[15px] text-gray-600 px-2 leading-relaxed">Hey, Enter your details to get sign in to your account</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-[14px] text-gray-900 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all font-medium"
                                placeholder="Enter Email / Phone No"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border border-gray-300"></div>
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-[14px] text-gray-900 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all font-medium pr-16"
                                placeholder="Passcode"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-500 hover:text-gray-800 transition-colors tracking-wide"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Show" : "Hide"}
                            </button>
                        </div>

                        <div className="pt-2 pb-1">
                            <Link
                                to="/forgot-password"
                                className="text-[14px] font-bold text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Having trouble in sign in?
                            </Link>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="pt-3">
                            <button
                                type="submit"
                                className="w-full bg-[#facb8e] hover:bg-[#f6bd74] active:bg-[#eeb164] text-gray-900 font-bold text-[16px] py-[14px] rounded-xl transition-all duration-200"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100/60 text-center">
                        <Link
                            to="/"
                            className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors tracking-wide"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
