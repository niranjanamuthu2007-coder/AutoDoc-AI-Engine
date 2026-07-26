import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ArrowRight, 
  Cpu, 
  GitBranch, 
  Terminal, 
  ShieldCheck, 
  Code 
} from 'lucide-react';
export const Landing: React.FC = () => {
  const { mockLogin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async () => {
    try {
      setError(null);
      await mockLogin();
      navigate('/workspace');
    } catch (err) {
      setError("OAuth connection failed. Please ensure the backend is running.");
    }
  };
  const features = [
    {
      title: "AST-Based Parser",
      desc: "Static analysis using Python Abstract Syntax Trees mapping endpoints without running unsafe code.",
      icon: Cpu
    },
    {
      title: "Dependency Graphing",
      desc: "Visualizes imports and architectures inside an interactive SVG relationship node mapper.",
      icon: GitBranch
    },
    {
      title: "OpenAPI Documentation",
      desc: "Auto-compiles complete OpenAPI v3 specifications ready to be loaded into Swagger.",
      icon: Terminal
    },
    {
      title: "Code Quality Audit",
      desc: "Scans for nested control block limits, empty exception handlers, and SQL injection flaws.",
      icon: ShieldCheck
    }
  ];
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-slate-100 flex flex-col justify-between selection:bg-brand-500/30 selection:text-brand-300">
      
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-glow">
            <Activity className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">AutoDoc AI</h1>
            <span className="text-[9px] text-brand-400 font-extrabold tracking-wider uppercase">Source Intelligence</span>
          </div>
        </div>
        <div>
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className="text-sm font-semibold bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-slate-300 px-5 py-2 rounded-xl transition-all"
          >
            {isLoading ? 'Connecting...' : 'Sign In'}
          </button>
        </div>
      </header>
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto w-full px-6 py-12 text-center relative z-10 flex-1 flex flex-col justify-center items-center">
        {/* Glow Background Gradient */}
        <div className="absolute w-[450px] h-[450px] bg-brand-600/10 rounded-full blur-[140px] -top-12 -z-10 animate-pulse"></div>
        <div className="inline-flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-400 mb-6">
          <Code className="w-3.5 h-3.5" />
          <span>Python FastAPI, Flask & DRF Supported</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          AI-Powered Source Code <br />
          <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent">
            Intelligence Platform
          </span>
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed font-medium">
          Automatically discover REST API endpoints, map file dependencies, audit safety vulnerabilities, and chat directly with your codebase using secure static analysis.
        </p>
        {error && (
          <div className="text-red-400 text-xs font-semibold mb-4 bg-red-950/20 border border-red-900/40 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-xl shadow-glow transition-all"
          >
            <span>Continue with Google</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        {/* Demo Interface Preview Layout */}
        <div className="mt-20 w-full relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-[#111116] border border-slate-800/80 rounded-2xl p-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60 block"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/60 block"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/60 block"></span>
              </div>
              <div className="text-xs font-semibold text-slate-500 tracking-wider">autodoc-scan-preview.json</div>
            </div>
            
            <div className="text-left font-mono text-xs text-brand-300/90 leading-6 overflow-hidden max-h-48 opacity-85">
              <p>&gt; <span className="text-emerald-400">Scanning repository:</span> python-fastapi-app.zip</p>
              <p>&gt; <span className="text-blue-400">Framework detected:</span> FastAPI</p>
              <p>&gt; <span className="text-purple-400">Parsing AST structures...</span> Done.</p>
              <p>&gt; <span className="text-yellow-400">Discovered routes:</span></p>
              <p className="pl-4">
               ↳ <span className="text-emerald-400">GET</span> /api/v1/users/profile{" "}
                <span className="text-slate-500">
                  {"->"} handlers.users.get_profile [Requires Auth]
                </span>
              </p>

              <p className="pl-4">
               ↳ <span className="text-purple-400">POST</span> /api/v1/auth/token{" "}
              <span className="text-slate-500">
                {"->"} handlers.auth.login
              </span>
              </p>
              <p>&gt; <span className="text-slate-400">Analyzing dependency import networks...</span> Done.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Features Grid */}
      <section className="bg-[#0e0e13]/80 border-t border-slate-900/50 py-20 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-extrabold text-white mb-4">Complete Codebase Intelligence</h3>
            <p className="text-slate-400 max-w-xl mx-auto font-medium">AutoDoc scans static syntax structures, providing real-time data without container compilation dependencies.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl flex flex-col gap-4 hover:border-brand-500/30 transition-all hover:translate-y-[-2px]">
                  <div className="w-10 h-10 bg-brand-950/60 border border-brand-900/30 rounded-xl flex items-center justify-center text-brand-400">
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="font-bold text-white text-base">{f.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-600 bg-black/40 z-10">
        <p>© 2026 AutoDoc AI Engine. Built for professional source code auditing.</p>
      </footer>
    </div>
  );
};
