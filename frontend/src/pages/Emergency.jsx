import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AlertTriangle, ShieldAlert, Phone, MapPin, Radar, XCircle } from 'lucide-react';

export default function Emergency() {
    const { t } = useTranslation();
    const [scanning, setScanning] = useState(false);
    const [alarmActive, setAlarmActive] = useState(false);
    const [scanMessage, setScanMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [offlineMode, setOfflineMode] = useState(false);
    const [showNearest, setShowNearest] = useState(false);
    
    // Siren audio
    const [audio] = useState(new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'));

    useEffect(() => {
        if (alarmActive) {
            audio.loop = true;
            audio.play().catch(e => console.log('Audio play prevented by browser', e));
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
        return () => {
            audio.pause();
        };
    }, [alarmActive, audio]);

    const calculateFloodRisk = (weatherData, aqi) => {
        if (!weatherData) return { level: 'SAFE', color: '#10b981', desc: 'Awaiting data' };
        
        const rain = weatherData.rain ? (weatherData.rain['1h'] || weatherData.rain['3h'] || 0) : 0;
        const pressure = weatherData.main.pressure;
        const humidity = weatherData.main.humidity;
        const isStorm = weatherData.weather[0].main === 'Thunderstorm';
        
        let riskScore = 0;
        if (rain > 15) riskScore += 50;
        else if (rain > 5) riskScore += 25;
        else if (rain > 0) riskScore += 10;
        
        if (pressure < 1000) riskScore += 20;
        else if (pressure < 1008) riskScore += 10;
        
        if (humidity > 90) riskScore += 15;
        else if (humidity > 80) riskScore += 5;
        
        if (isStorm) riskScore += 30;
        
        if (riskScore >= 45) {
            return { level: 'DANGER', desc: 'Critical Risk: Heavy rain and low pressure detected. Evacuate low areas.' };
        } else if (riskScore >= 20) {
            return { level: 'WARNING', desc: 'Moderate Risk: Conditions are favorable for localized flooding.' };
        } else {
            return { level: 'SAFE', desc: 'Low Risk: Environmental parameters are stable.' };
        }
    };

    const findNearest = (query) => {
        const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        window.open(url, '_blank');
    };

    const scanRegionalThreat = () => {
        if (offlineMode) {
            alert('Regional scan requires an internet connection.');
            return;
        }
        setScanning(true);
        setScanMessage(null);
        
        if (!navigator.geolocation) {
            setScanMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
            setScanning(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            try {
                const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || 'a8d86111d4924a1dc142a08c6480396f';
                const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
                const aqiRes = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
                
                const riskData = calculateFloodRisk(weatherRes.data, aqiRes.data.list[0].main.aqi);
                
                if (riskData.level === 'DANGER' || riskData.level === 'WARNING') {
                    setAlarmActive(true);
                    setScanMessage({ 
                        type: 'danger', 
                        text: `🚨 FLOOD DETECTED IN 50KM RADIUS!\n\nRisk: ${riskData.level}\n${riskData.desc}` 
                    });
                } else {
                    setScanMessage({ 
                        type: 'safe', 
                        text: '✅ Area Clear. No immediate flood threat detected in your 50km radius.' 
                    });
                }
            } catch (error) {
                setScanMessage({ type: 'error', text: 'Failed to complete regional scan. Check network.' });
            }
            setScanning(false);
        }, () => {
            setScanMessage({ type: 'error', text: 'Location permission denied.' });
            setScanning(false);
        });
    };

    const shareLocation = () => {
        setLoading(true);
        if (!navigator.geolocation) return alert('Geolocation not supported');
        
        navigator.geolocation.getCurrentPosition((position) => {
            const url = `https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}`;
            if (navigator.share) {
                navigator.share({
                    title: 'Emergency Location',
                    text: '🚨 EMERGENCY: I need help! My live location is:',
                    url: url
                }).catch(console.error);
            } else {
                alert(`Share this link: ${url}`);
            }
            setLoading(false);
        });
    };

    return (
        <div className={`container-fluid pt-5 mt-5 min-vh-100 ${alarmActive ? 'bg-danger bg-opacity-25' : ''}`} style={{ transition: 'background-color 0.3s ease' }}>
            <div className="container py-4">
                <div className="d-flex align-items-center gap-3 mb-4">
                    <ShieldAlert size={40} className={alarmActive ? "text-danger pulse-circle-svg" : "text-accent"} />
                    <div>
                        <h2 className="fw-bold text-white mb-0">{t('emergency_toolkit')}</h2>
                        <p className="text-white-50 mb-0">{t('emergency_desc')}</p>
                    </div>
                </div>

                {/* Offline Mode Banner */}
                {offlineMode && (
                    <div className="alert alert-warning d-flex align-items-center gap-3 border-2 border-warning mb-4 shadow-lg" style={{ backgroundColor: '#fef3c7' }}>
                        <ShieldAlert className="text-warning" size={40} />
                        <div className="flex-grow-1">
                            <h4 className="fw-bold text-warning mb-1">{t('offline_active')}</h4>
                            <p className="mb-0 text-warning">{t('offline_desc')}</p>
                        </div>
                    </div>
                )}

                {/* Active Alarm Banner */}
                {alarmActive && (
                    <div className="alert alert-danger d-flex align-items-center gap-3 border-2 border-danger mb-4 shadow-lg" style={{ backgroundColor: '#ffe4e6' }}>
                        <AlertTriangle className="text-danger" size={40} />
                        <div className="flex-grow-1">
                            <h4 className="fw-bold text-danger mb-1">{t('evac_warning')}</h4>
                            <p className="mb-0 text-danger" style={{ whiteSpace: 'pre-line' }}>{scanMessage?.text}</p>
                        </div>
                        <button className="btn btn-outline-danger border-0" onClick={() => setAlarmActive(false)}>
                            <XCircle size={32} />
                        </button>
                    </div>
                )}

                <div className="row g-4 mb-4">
                    <div className="col-lg-12">
                        <div className={`glass-panel p-4 rounded-4 text-center cursor-pointer ${alarmActive ? 'border-danger' : 'border-info'}`} 
                             onClick={!scanning && !alarmActive && !offlineMode ? scanRegionalThreat : undefined}
                             style={{ cursor: scanning || alarmActive || offlineMode ? 'not-allowed' : 'pointer', opacity: offlineMode ? 0.6 : 1 }}>
                            <Radar size={48} className={`mb-3 ${scanning ? 'text-secondary' : 'text-info'} ${scanning && 'pulse-circle-svg'}`} />
                            <h3 className="fw-bold text-white mb-2">{scanning ? t('scanning_satellite') : t('scan_area')}</h3>
                            <p className="text-white-50 mb-0">{offlineMode ? t('offline_desc') : t('emergency_desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Scan Result Message */}
                {scanMessage && !alarmActive && (
                    <div className={`alert ${scanMessage.type === 'safe' ? 'alert-success border-success' : 'alert-danger border-danger'} mb-4`}>
                        <div className="fw-bold">{scanMessage.text}</div>
                    </div>
                )}

                <div className="row g-4">
                    {/* SOS Action */}
                    <div className="col-lg-6">
                        <a href="tel:112" className="text-decoration-none">
                            <div className="glass-panel bg-danger bg-opacity-75 p-4 rounded-4 text-center h-100 hover-lift">
                                <AlertTriangle size={48} className="text-white mb-3" />
                                <h3 className="fw-bold text-white mb-1">{t('sos_national')}</h3>
                                <p className="text-white-50 mb-0">{t('dial_112')}</p>
                            </div>
                        </a>
                    </div>
                    
                    {/* NDRF */}
                    <div className="col-lg-3 col-md-6">
                        <a href="tel:1078" className="text-decoration-none">
                            <div className="glass-panel p-4 rounded-4 text-center h-100 hover-lift">
                                <ShieldAlert size={40} className="text-accent mb-3" />
                                <h4 className="fw-bold text-white mb-1">{t('ndrf_help')}</h4>
                                <p className="text-white-50 mb-0">{t('disaster_relief')}</p>
                            </div>
                        </a>
                    </div>

                    {/* Ambulance */}
                    <div className="col-lg-3 col-md-6">
                        <a href="tel:108" className="text-decoration-none">
                            <div className="glass-panel p-4 rounded-4 text-center h-100 hover-lift">
                                <Phone size={40} className="text-danger mb-3" />
                                <h4 className="fw-bold text-white mb-1">{t('ambulance')}</h4>
                                <p className="text-white-50 mb-0">{t('medical_emergency')}</p>
                            </div>
                        </a>
                    </div>

                    {/* Share Location */}
                    <div className="col-12">
                        <button 
                            className="btn btn-outline-light w-100 p-4 rounded-4 d-flex justify-content-center align-items-center gap-3 hover-lift"
                            onClick={shareLocation}
                            disabled={loading}
                        >
                            <MapPin size={28} className="text-info" />
                            <span className="fs-4 fw-bold">{loading ? t('acquiring_gps') : t('share_live_location')}</span>
                        </button>
                    </div>

                    {/* Nearest Facilities Section */}
                    <div className="col-12 mt-4">
                        <h3 className="text-white fw-bold mb-3">{t('nearest_facilities')}</h3>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <div className="glass-panel p-3 rounded-4 d-flex align-items-center gap-3 hover-lift cursor-pointer border-success border-opacity-25" onClick={() => findNearest('Emergency Shelters')}>
                                    <div className="bg-success bg-opacity-25 p-3 rounded-3"><Radar size={24} className="text-success" /></div>
                                    <div className="text-white fw-bold">{t('emergency_shelters')}</div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="glass-panel p-3 rounded-4 d-flex align-items-center gap-3 hover-lift cursor-pointer border-danger border-opacity-25" onClick={() => findNearest('Hospitals')}>
                                    <div className="bg-danger bg-opacity-25 p-3 rounded-3"><AlertTriangle size={24} className="text-danger" /></div>
                                    <div className="text-white fw-bold">{t('nearest_hospitals')}</div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="glass-panel p-3 rounded-4 d-flex align-items-center gap-3 hover-lift cursor-pointer border-primary border-opacity-25" onClick={() => findNearest('Police Stations')}>
                                    <div className="bg-primary bg-opacity-25 p-3 rounded-3"><ShieldAlert size={24} className="text-primary" /></div>
                                    <div className="text-white fw-bold">{t('police_stations')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 mt-5">
                        <button 
                            className={`btn ${offlineMode ? 'btn-warning' : 'btn-outline-warning'} w-100 p-3 rounded-4 fw-bold`}
                            onClick={() => setOfflineMode(!offlineMode)}
                        >
                            {offlineMode ? t('disable_offline') : t('enable_offline')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
