import React, { useState, useRef, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';
import DataHub from './pages/DataHub';
import ModelIntel from './pages/ModelIntel';
import AlertCenter from './pages/AlertCenter';
import Emergency from './pages/Emergency';
import FloatingAIAssistant from './components/FloatingAIAssistant';
import { Activity, Database, Brain, Bell, AlertTriangle } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import 'leaflet/dist/leaflet.css';
import './index.css';

// --- 3D Background Components ---
const FloatingParticles = () => {
    const ref = useRef();
    const count = 3000;
    const positions = useMemo(() => {
        const p = new Float32Array(count * 3);
        for(let i=0; i<count*3; i++) p[i] = (Math.random() - 0.5) * 25;
        return p;
    }, []);

    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.rotation.y += delta * 0.05;
            ref.current.rotation.x += delta * 0.02;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#38bdf8" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
    );
};

// --- Startup Screen ---
const StartupScreen = ({ onComplete }) => {
    return (
        <div className="startup-screen">
            <video 
                src="/Video_Generation_for_Website_UI.mp4" 
                autoPlay 
                muted 
                playsInline
                onEnded={onComplete}
                className="startup-video"
            />
            <div className="startup-overlay">
                <div className="text-center mb-5">
                    <h1 className="fw-bold text-white mb-2" style={{ textShadow: '0 0 20px #38bdf8' }}>FloodGuard AI</h1>
                    <p className="text-accent text-uppercase tracking-wider">Initializing Core Systems...</p>
                </div>
                <button onClick={onComplete} className="btn btn-outline-info rounded-pill px-5 py-2 fw-bold text-uppercase mt-5">Skip Initialization</button>
            </div>
        </div>
    );
};

// --- Navigation ---
const Navigation = () => {
    const location = useLocation();
    const getLinkClass = (path) => {
        return `nav-link px-3 py-2 rounded-3 d-flex align-items-center gap-2 transition-all ${location.pathname === path ? 'active-nav-item' : 'text-white-50 hover-nav-item'}`;
    };

    return (
        <nav className="navbar navbar-expand-lg glass-nav fixed-top shadow-lg">
            <div className="container-fluid px-4">
                <Link className="navbar-brand fw-bold d-flex align-items-center gap-2 text-white z-index-2" to="/">
                    <Activity size={26} className="text-accent glow-icon" /> 
                    Flood<span className="text-accent">Guard</span> AI
                </Link>
                <button className="navbar-toggler border-0 bg-transparent text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon" style={{filter: 'invert(1)'}}></span>
                </button>
                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul className="navbar-nav gap-2">
                        <li className="nav-item"><Link className={getLinkClass('/')} to="/"><Activity size={18}/> Command Center</Link></li>
                        <li className="nav-item"><Link className={getLinkClass('/model')} to="/model"><Brain size={18}/> Intelligence</Link></li>
                        <li className="nav-item"><Link className={getLinkClass('/alerts')} to="/alerts"><Bell size={18}/> Alerts & Docs</Link></li>
                        <li className="nav-item"><Link className={getLinkClass('/emergency')} to="/emergency"><AlertTriangle size={18} className="text-danger"/> Emergency SOS</Link></li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export const GlobalStateContext = React.createContext();

function App() {
    const [alertHistory, setAlertHistory] = useState([]);
    const [startupComplete, setStartupComplete] = useState(false);

    if (!startupComplete) {
        return <StartupScreen onComplete={() => setStartupComplete(true)} />;
    }

    return (
        <GlobalStateContext.Provider value={{ alertHistory, setAlertHistory }}>
            <Router>
                <div className="app-wrapper">
                    {/* Background Video */}
                    <video 
                        className="bg-video"
                        src="/Video_Generation_Request_Fulfilled.mp4" 
                        autoPlay loop muted playsInline
                    />
                    <div className="bg-overlay"></div>
                    
                    {/* 3D React Fiber Canvas Overlay */}
                    <div className="canvas-overlay">
                        <Canvas camera={{ position: [0, 0, 5] }}>
                            <FloatingParticles />
                        </Canvas>
                    </div>

                    <Navigation />
                    
                    <div className="content-area container-fluid position-relative z-index-1" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
                        <Routes>
                            <Route path="/" element={<CommandCenter />} />
                            <Route path="/model" element={<ModelIntel />} />
                            <Route path="/alerts" element={<AlertCenter />} />
                            <Route path="/emergency" element={<Emergency />} />
                        </Routes>
                    </div>
                    
                    {/* Global Floating AI Assistant Widget */}
                    <FloatingAIAssistant />
                </div>
            </Router>
        </GlobalStateContext.Provider>
    );
}

export default App;
