import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, AlertTriangle, ShieldCheck, Activity, Search, MapPin, CloudRain, Wind, Navigation, Home, Truck, Hospital, Layers, Droplets } from 'lucide-react';
import { Polyline, LayersControl, LayerGroup, FeatureGroup } from 'react-leaflet';
import { GlobalStateContext } from '../App';

// Fix default Leaflet marker icon (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const featuresList = [
    "MonsoonIntensity", "TopographyDrainage", "RiverManagement",
    "Deforestation", "Urbanization", "ClimateChange", "DamsQuality",
    "Siltation", "AgriculturalPractices", "Encroachments",
    "IneffectiveDisasterPreparedness", "DrainageSystems",
    "CoastalVulnerability", "Landslides", "Watersheds",
    "DeterioratingInfrastructure", "PopulationScore", "WetlandLoss",
    "InadequatePlanning", "PoliticalFactors"
];

// Component to fix Leaflet invalidateSize on mount and resize
const InvalidateSize = () => {
    const map = useMap();
    useEffect(() => {
        // Small delay to ensure container is fully rendered
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        const handleResize = () => {
            map.invalidateSize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);
    return null;
};

// Component to fly map to a given center when it changes
const FlyToCenter = ({ center, zoom }) => {
    const map = useMap();
    const prevCenterRef = useRef(center);

    useEffect(() => {
        const [prevLat, prevLon] = prevCenterRef.current;
        const [lat, lon] = center;
        if (prevLat !== lat || prevLon !== lon) {
            map.flyTo(center, zoom || 13, { animate: true, duration: 1.5 });
            prevCenterRef.current = center;
        }
    }, [center, zoom, map]);

    // Also invalidate on center change
    useEffect(() => {
        const timer = setTimeout(() => map.invalidateSize(), 300);
        return () => clearTimeout(timer);
    }, [center, map]);

    return null;
};

const calculateUS_AQI = (pm25) => {
    if (pm25 <= 12.0) return Math.round((50 - 0) / (12.0 - 0) * (pm25 - 0) + 0);
    if (pm25 <= 35.4) return Math.round((100 - 51) / (35.4 - 12.1) * (pm25 - 12.1) + 51);
    if (pm25 <= 55.4) return Math.round((150 - 101) / (55.4 - 35.5) * (pm25 - 35.5) + 101);
    if (pm25 <= 150.4) return Math.round((200 - 151) / (150.4 - 55.5) * (pm25 - 55.5) + 151);
    if (pm25 <= 250.4) return Math.round((300 - 201) / (250.4 - 150.5) * (pm25 - 150.5) + 201);
    if (pm25 <= 350.4) return Math.round((400 - 301) / (350.4 - 250.5) * (pm25 - 250.5) + 301);
    if (pm25 <= 500.4) return Math.round((500 - 401) / (500.4 - 350.5) * (pm25 - 350.5) + 401);
    return 500;
};

const getAqiLabel = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sens.)';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

export default function CommandCenter() {
    const { t } = useTranslation();
    const { setAlertHistory } = useContext(GlobalStateContext);
    const [features, setFeatures] = useState(
        featuresList.reduce((acc, curr) => ({ ...acc, [curr]: 5 }), {})
    );
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [cityQuery, setCityQuery] = useState('');
    const [mapCenter, setMapCenter] = useState([26.2183, 78.1828]); // Default Gwalior
    const [searchedCity, setSearchedCity] = useState('');
    const [searching, setSearching] = useState(false);
    const [apiError, setApiError] = useState(false);
    const [mapKey, setMapKey] = useState(0); // Force re-create map when needed
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSafeRoutes, setShowSafeRoutes] = useState(false);
    const [impactStats, setImpactStats] = useState(null);
    const [activeLayers, setActiveLayers] = useState({
        heatmap: true,
        zones: true,
        rivers: true
    });
    const [riverData, setRiverData] = useState([]);
    const [proneZones, setProneZones] = useState([]);
    const searchTimeoutRef = useRef(null);
    const searchFormRef = useRef(null);

    const reportRef = useRef();

    const handleSliderChange = (e, feature) => {
        setFeatures({ ...features, [feature]: parseFloat(e.target.value) });
    };

    // Debounced autocomplete search
    const handleInputChange = (e) => {
        const value = e.target.value;
        setCityQuery(value);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (value.length >= 2) {
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=in`
                    );
                    if (res.data && res.data.length > 0) {
                        setSuggestions(res.data.map(item => ({
                            name: item.display_name.split(',').slice(0, 3).join(','),
                            lat: parseFloat(item.lat),
                            lon: parseFloat(item.lon),
                            fullName: item.display_name,
                        })));
                        setShowSuggestions(true);
                    } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                    }
                } catch {
                    setSuggestions([]);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (suggestion) => {
        setCityQuery(suggestion.name.split(',')[0]);
        setShowSuggestions(false);
        setSuggestions([]);
        applyLocation(suggestion.lat, suggestion.lon, suggestion.name.split(',')[0]);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchFormRef.current && !searchFormRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [weatherData, setWeatherData] = useState(null);

    const fetchWeather = async (lat, lon) => {
        try {
            const apiKey = 'a8d86111d4924a1dc142a08c6480396f';
            const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
            const aqiRes = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
            
            const components = aqiRes.data.list[0].components;
            const pm25 = components.pm2_5;
            
            const data = {
                ...weatherRes.data,
                aqi: calculateUS_AQI(pm25),
                aqiComponents: components
            };
            
            setWeatherData(data);
            
            // Adjust simulation features dynamically based on real weather
            return data;
        } catch (error) {
            console.error("Error fetching live weather/AQI:", error);
            setWeatherData(null);
            return null;
        }
    };

    const applyLocation = useCallback(async (lat, lon, cityName) => {
        setMapCenter([lat, lon]);
        setSearchedCity(cityName || cityQuery);
        
        // Fetch Live Weather Data
        const liveWeather = await fetchWeather(lat, lon);
        
        // Automatically sync Environment Sensors based on location
        const seed = Math.abs(lat * 100 + lon * 100);
        const newFeatures = {};
        featuresList.forEach((feature, index) => {
            const val = Math.floor(((seed * (index + 7)) % 12) + 2);
            newFeatures[feature] = val;
        });
        
        // Inject live weather logic
        if (liveWeather) {
            const rain = liveWeather.rain ? (liveWeather.rain['1h'] || liveWeather.rain['3h'] || 0) : 0;
            if (rain > 15) newFeatures['MonsoonIntensity'] = 15;
            else if (rain > 5) newFeatures['MonsoonIntensity'] = 12;
            else if (rain > 0) newFeatures['MonsoonIntensity'] = 8;
            
            if (liveWeather.main.humidity > 85) newFeatures['TopographyDrainage'] = 14;
        }
        
        // Add some realistic tweaks based on city name
        const cityLower = (cityName || cityQuery).toLowerCase();
        if (cityLower.includes('mumbai') || cityLower.includes('chennai') || cityLower.includes('kochi') || cityLower.includes('goa')) {
            newFeatures['CoastalVulnerability'] = 14;
            if (!liveWeather) newFeatures['MonsoonIntensity'] = 13;
        } else if (cityLower.includes('delhi') || cityLower.includes('bangalore') || cityLower.includes('bengaluru')) {
            newFeatures['Urbanization'] = 15;
            newFeatures['CoastalVulnerability'] = 1;
        } else if (cityLower.includes('patna') || cityLower.includes('guwahati') || cityLower.includes('kolkata')) {
            newFeatures['RiverManagement'] = 13;
            newFeatures['Siltation'] = 12;
            if (!liveWeather) newFeatures['TopographyDrainage'] = 11;
        } else if (cityLower.includes('shimla') || cityLower.includes('manali') || cityLower.includes('srinagar')) {
            newFeatures['Landslides'] = 14;
            if (!liveWeather) newFeatures['TopographyDrainage'] = 12;
        }

        setFeatures(newFeatures);

        // Generate Simulated Smart Map Data
        const rivers = [
            { id: 1, name: 'Main Channel', pos: [lat + 0.005, lon + 0.02], level: (Math.random() * 5 + 2).toFixed(1), status: 'Normal' },
            { id: 2, name: 'North Tributary', pos: [lat + 0.02, lon - 0.01], level: (Math.random() * 8 + 5).toFixed(1), status: 'Warning' },
            { id: 3, name: 'South Canal', pos: [lat - 0.015, lon - 0.02], level: (Math.random() * 3 + 1).toFixed(1), status: 'Normal' }
        ];
        setRiverData(rivers);

        const zones = [
            { pos: [lat + 0.015, lon + 0.015], radius: 1200, type: 'prone' },
            { pos: [lat - 0.01, lon - 0.025], radius: 900, type: 'prone' },
            { pos: [lat + 0.025, lon - 0.03], radius: 1000, type: 'safe' }
        ];
        setProneZones(zones);

        // Force map to re-render fresh tiles
        setMapKey(prev => prev + 1);
    }, [cityQuery]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!cityQuery) return;
        setSearching(true);
        setShowSuggestions(false);
        try {
            const res = await axios.get(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&countrycodes=in`
            );
            if (res.data && res.data.length > 0) {
                const lat = parseFloat(res.data[0].lat);
                const lon = parseFloat(res.data[0].lon);
                applyLocation(lat, lon, cityQuery);
            } else {
                alert("Location not found. Try a different search term.");
            }
        } catch (err) {
            console.error(err);
            alert("Search failed. Please check your internet connection.");
        }
        setSearching(false);
    };

    const handlePredict = async () => {
        setLoading(true);
        setApiError(false);
        try {
            const apiKey = import.meta.env.VITE_API_KEY;
            const baseUrl = import.meta.env.VITE_API_URL || 'https://anshulsikarawar-floodguardai.hf.space';
            const headers = apiKey ? { 'X-API-Key': apiKey } : {};
            const response = await axios.post(`${baseUrl}/predict`, features, { headers });
            setResult(response.data);
            
            // Calculate Impact Prediction based on severity and probability
            const mult = response.data.severity === 'High' ? 1 : (response.data.severity === 'Moderate' ? 0.4 : 0.05);
            const prob = response.data.probability;
            setImpactStats({
                houses: Math.floor(prob * mult * 8500),
                roads: (prob * mult * 42).toFixed(1),
                hospitals: Math.floor(prob * mult * 4),
                displaced: Math.floor(prob * mult * 25000)
            });

            if (response.data.trigger_alert) {
                setShowSafeRoutes(true);
                setAlertHistory(prev => [{
                    time: new Date().toLocaleTimeString(),
                    location: searchedCity || cityQuery || "Gwalior",
                    severity: response.data.severity,
                    probability: (response.data.probability * 100).toFixed(1) + "%"
                }, ...prev]);
            } else {
                setShowSafeRoutes(false);
            }
        } catch (error) {
            console.error("Error fetching prediction:", error);
            setApiError(true);
        }
        setLoading(false);
    };

    const exportPDF = () => {
        const input = reportRef.current;
        html2canvas(input, { backgroundColor: '#0f172a' }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save("Command_Center_Snapshot.pdf");
        });
    };

    if (apiError) {
        return (
            <div className="container d-flex flex-column align-items-center justify-content-center h-100 text-center text-white">
                <AlertTriangle size={64} className="text-danger mb-4" />
                <h2 className="fw-bold">Connection Terminated</h2>
                <p className="text-white-50">Unable to establish secure uplink to the FastAPI Prediction Engine.</p>
                <button className="btn btn-outline-light mt-3" onClick={() => setApiError(false)}>Retry Connection</button>
            </div>
        );
    }

    return (
        <div className="row g-4 px-3" ref={reportRef}>
            <div className="col-12 d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h3 className="fw-bold text-white mb-0">{t('command_center')}</h3>
                    <p className="text-white-50 small mb-0">{t('live_telemetry')}</p>
                </div>
                <button onClick={exportPDF} className="btn btn-outline-info d-flex align-items-center gap-2">
                    <Download size={18} /> {t('export_pdf')}
                </button>
            </div>

            {/* Inputs Sidebar */}
            <div className="col-lg-3">
                <div className="glass-panel p-3 h-100" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                    <h5 className="mb-4 border-bottom border-secondary pb-2 text-white">{t('environment_sensors')}</h5>
                    {featuresList.map(feature => (
                        <div className="mb-3" key={feature}>
                            <label className="form-label d-flex justify-content-between small text-white-50 mb-1">
                                <span>{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-accent fw-bold">{features[feature]}</span>
                            </label>
                            <input 
                                type="range" 
                                className="form-range range-slider" 
                                min="0" max="15" step="1" 
                                value={features[feature]}
                                onChange={(e) => handleSliderChange(e, feature)}
                            />
                        </div>
                    ))}
                    <button 
                        className="btn btn-accent w-100 py-3 fw-bold mt-2"
                        onClick={handlePredict}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        ) : <Activity size={18} className="me-2 d-inline" />}
                        {loading ? t('calculating_risk') : t('run_assessment')}
                    </button>
                </div>
            </div>

            {/* Main Dashboard Area */}
            <div className="col-lg-9">
                <div className="row mb-4">
                    <div className="col-md-7">
                        <div className="glass-panel p-3 d-flex align-items-center h-100" ref={searchFormRef} style={{ position: 'relative' }}>
                            <form className="w-100 d-flex gap-2" onSubmit={handleSearch} autoComplete="off">
                                <div className="position-relative flex-grow-1">
                                    <input 
                                        type="text" 
                                        className="form-control bg-transparent text-white border-secondary" 
                                        placeholder={t('search_placeholder')} 
                                        value={cityQuery}
                                        onChange={handleInputChange}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    {cityQuery && (
                                        <button 
                                            type="button"
                                            className="btn btn-sm position-absolute text-white-50"
                                            style={{ top: '50%', right: '8px', transform: 'translateY(-50%)', padding: '2px 6px', lineHeight: 1 }}
                                            onClick={() => { setCityQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                    {/* Autocomplete Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="autocomplete-dropdown">
                                            {suggestions.map((s, i) => (
                                                <div 
                                                    key={i} 
                                                    className="autocomplete-item"
                                                    onClick={() => selectSuggestion(s)}
                                                >
                                                    <MapPin size={14} className="text-accent me-2 flex-shrink-0" />
                                                    <span className="text-truncate">{s.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn btn-accent d-flex align-items-center gap-2 px-4" disabled={searching}>
                                    <Search size={18} /> {searching ? t('locating') : t('locate')}
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="glass-panel p-3 text-center h-100 d-flex flex-column align-items-center justify-content-center gap-2">
                            {result ? (
                                <div className="d-flex w-100 justify-content-around align-items-center flex-wrap gap-2">
                                    <div className="text-start">
                                        <div className="small text-white-50 text-uppercase">{t('probability')}</div>
                                        <div className="fw-bold fs-3" style={{ color: result.alert_color }}>
                                            {(result.probability * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className={`severity-badge ${result.severity === 'High' ? 'glow-red' : ''} px-3 py-2 rounded-pill fw-bold ${result.severity === 'Moderate' ? 'text-dark' : 'text-white'}`}
                                        style={{ backgroundColor: result.alert_color }}>
                                        {result.severity === 'High' && <AlertTriangle size={18} className="me-1 d-inline" />}
                                        {result.severity.toUpperCase()}
                                    </div>
                                    <div className="text-start border-start border-secondary ps-3">
                                        <div className="small text-white-50 text-uppercase">{t('est_affected')}</div>
                                        <div className="fw-bold fs-4 text-warning">
                                            {result.severity === 'High' ? Math.floor(result.probability * 150000).toLocaleString() : (result.severity === 'Moderate' ? Math.floor(result.probability * 50000).toLocaleString() : 'Minimal')}
                                        </div>
                                    </div>
                                    <div className="text-start border-start border-secondary ps-3">
                                        <div className="small text-white-50 text-uppercase">{t('evac_status')}</div>
                                        <div className="fw-bold fs-5" style={{ color: result.trigger_alert ? '#ef4444' : '#10b981' }}>
                                            {result.trigger_alert ? t('mandatory') : t('standby')}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center gap-4">
                                    <div className="text-white-50 d-flex align-items-center gap-2">
                                        <Activity size={18} className="text-accent" />
                                        {t('awaiting_telemetry')}
                                    </div>
                                    <div className="form-check form-switch border-start border-secondary ps-5">
                                        <input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            role="switch" 
                                            id="routeToggleAlways" 
                                            checked={showSafeRoutes}
                                            onChange={(e) => setShowSafeRoutes(e.target.checked)}
                                        />
                                        <label className="form-check-label text-white-50 small" htmlFor="routeToggleAlways">{t('safe_routes')}</label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location indicator */}
                {searchedCity && (
                    <div className="d-flex justify-content-between align-items-center mb-2 ms-1">
                        <div className="d-flex align-items-center gap-2">
                            <MapPin size={14} className="text-accent" />
                            <span className="small text-white-50">
                                Viewing: <span className="text-accent fw-semibold">{searchedCity}</span>
                                <span className="ms-2 text-white-50">({mapCenter[0].toFixed(4)}°N, {mapCenter[1].toFixed(4)}°E)</span>
                            </span>
                        </div>
                        {result?.trigger_alert && (
                             <span className="badge bg-danger pulse-circle-svg px-3">{t('evac_warning')}</span>
                        )}
                    </div>
                )}
                
                {/* Live Telemetry Meters */}
                {weatherData && (
                    <div className="mb-3">
                        <div className="d-flex gap-3 mb-3 ms-1">
                            {/* AQI Meter */}
                            <div className="glass-panel p-3 rounded" style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="small text-white-50 fw-semibold">{t('air_quality')}</span>
                                    <Wind size={16} className="text-white-50" />
                                </div>
                                <div className="d-flex align-items-baseline gap-2 mb-3">
                                    <h3 className="mb-0 fw-bold text-white" style={{ fontSize: '1.8rem' }}>{weatherData.aqi}</h3>
                                    <span className="small text-white-50">
                                        {getAqiLabel(weatherData.aqi)}
                                    </span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="small text-white-50" style={{ fontSize: '0.7rem' }}>Level</span>
                                    <div className="rounded-pill overflow-hidden" style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div 
                                            className="h-100 rounded-pill" 
                                            style={{ 
                                                width: `${Math.min(100, (weatherData.aqi / 500) * 100)}%`,
                                                background: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444, #9d174d)'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Pressure Meter */}
                            <div className="glass-panel p-3 rounded" style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="small text-white-50 fw-semibold">{t('air_pressure')}</span>
                                    <Activity size={16} className="text-white-50" />
                                </div>
                                <div className="d-flex align-items-baseline gap-2 mb-3">
                                    <h3 className="mb-0 fw-bold text-white" style={{ fontSize: '1.8rem' }}>{weatherData.main.pressure}</h3>
                                    <span className="small text-white-50">hPa</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="small text-white-50" style={{ fontSize: '0.7rem' }}>Normal</span>
                                    <div className="rounded-pill overflow-hidden" style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div 
                                            className="h-100 rounded-pill" 
                                            style={{ 
                                                width: `${Math.max(0, Math.min(100, ((weatherData.main.pressure - 980) / 60) * 100))}%`,
                                                backgroundColor: '#38bdf8'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Metrics */}
                        <div className="d-flex gap-3 ms-1">
                            <div className="glass-panel p-2 px-3 rounded d-flex align-items-center gap-3" style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
                                <CloudRain size={20} className="text-primary" />
                                <div>
                                    <div className="small text-white-50">{t('rainfall')}</div>
                                    <div className="fw-bold text-white">{weatherData.rain ? (weatherData.rain['1h'] || weatherData.rain['3h'] || 0) : 0} mm</div>
                                </div>
                            </div>
                            <div className="glass-panel p-2 px-3 rounded d-flex align-items-center gap-3" style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
                                <Activity size={20} className="text-danger" />
                                <div>
                                    <div className="small text-white-50">{t('temperature')}</div>
                                    <div className="fw-bold text-white">{Math.round(weatherData.main.temp)}°C</div>
                                </div>
                            </div>
                            <div className="glass-panel p-2 px-3 rounded d-flex align-items-center gap-3" style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
                                <Wind size={20} className="text-info" />
                                <div>
                                    <div className="small text-white-50">{t('humidity')}</div>
                                    <div className="fw-bold text-white">{weatherData.main.humidity}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-panel p-2" style={{ height: '55vh' }}>
                    {loading ? (
                        <div className="w-100 h-100 shimmer rounded"></div>
                    ) : (
                        <MapContainer 
                            key={mapKey}
                            center={mapCenter} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 0 }}
                            zoomControl={true}
                        >
                            <TileLayer 
                                url="https://api.maptiler.com/maps/basic-v2-dark/{z}/{x}/{y}.png?key=7QF0bAWRVrjmZH8PTCcZ" 
                                attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
                                tileSize={512}
                                zoomOffset={-1}
                                minZoom={1}
                                maxZoom={19}
                                crossOrigin={true}
                            />
                            
                            {/* Smart Map Layers */}
                            <LayersControl position="topright">
                                <LayersControl.Overlay checked name="Rainfall Heatmap">
                                    <LayerGroup>
                                        {/* Simulated Heatmap using gradients */}
                                        {[...Array(8)].map((_, i) => (
                                            <Circle 
                                                key={i}
                                                center={[mapCenter[0] + (Math.random() - 0.5) * 0.05, mapCenter[1] + (Math.random() - 0.5) * 0.05]}
                                                pathOptions={{ 
                                                    color: 'transparent', 
                                                    fillColor: '#3b82f6', 
                                                    fillOpacity: features.MonsoonIntensity / 40 
                                                }}
                                                radius={2000 + (Math.random() * 1000)}
                                            />
                                        ))}
                                    </LayerGroup>
                                </LayersControl.Overlay>

                                <LayersControl.Overlay checked name="Risk Zones">
                                    <FeatureGroup>
                                        {proneZones.map((z, i) => (
                                            <Circle 
                                                key={i}
                                                center={z.pos}
                                                pathOptions={{ 
                                                    color: z.type === 'prone' ? '#ef4444' : '#10b981', 
                                                    fillColor: z.type === 'prone' ? '#ef4444' : '#10b981', 
                                                    fillOpacity: 0.15,
                                                    dashArray: z.type === 'prone' ? '5, 5' : '0'
                                                }}
                                                radius={z.radius}
                                            >
                                                <Popup>{z.type === 'prone' ? '⚠️ FLOOD PRONE ZONE' : '✅ SAFE ASSEMBLY POINT'}</Popup>
                                            </Circle>
                                        ))}
                                    </FeatureGroup>
                                </LayersControl.Overlay>

                                <LayersControl.Overlay checked name="River Gauges">
                                    <LayerGroup>
                                        {riverData.map(r => (
                                            <Marker key={r.id} position={r.pos} icon={L.divIcon({
                                                className: 'custom-river-marker',
                                                html: `<div style="background: #0f172a; border: 2px solid #3b82f6; border-radius: 8px; padding: 4px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${r.status === 'Warning' ? '#f59e0b' : '#3b82f6'};"></div>
                                                        <span style="color: white; font-size: 10px; font-weight: bold;">${r.level}m</span>
                                                       </div>`,
                                                iconSize: [60, 30]
                                            })}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <h6 className="fw-bold mb-1">{r.name}</h6>
                                                        <div className="small text-white-50">Current Level: <span className="text-white">{r.level}m</span></div>
                                                        <div className="small text-white-50">Status: <span className={r.status === 'Warning' ? 'text-warning' : 'text-success'}>{r.status}</span></div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </LayerGroup>
                                </LayersControl.Overlay>
                            </LayersControl>

                            {/* Current location marker */}
                            <Marker position={mapCenter}>
                                <Popup>
                                    <strong>{searchedCity || 'Gwalior'}</strong><br />
                                    Lat: {mapCenter[0].toFixed(4)}, Lon: {mapCenter[1].toFixed(4)}
                                </Popup>
                            </Marker>

                            {result?.trigger_alert && (
                                <>
                                    <Circle center={mapCenter} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, className: 'pulse-circle-svg' }} radius={1500}>
                                        <Popup>Critical Flood Alert — {searchedCity || 'Gwalior'}</Popup>
                                    </Circle>
                                    {/* Evacuation Safe Zone Indicator */}
                                    <Circle center={[mapCenter[0] + 0.03, mapCenter[1] + 0.03]} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3 }} radius={800}>
                                        <Popup>Designated Safe Zone / Shelter</Popup>
                                    </Circle>
                                    <Circle center={[mapCenter[0] - 0.03, mapCenter[1] - 0.02]} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3 }} radius={800}>
                                        <Popup>Designated Safe Zone / Shelter</Popup>
                                    </Circle>
                                </>
                            )}
                            {result?.severity === 'Moderate' && (
                                <Circle center={mapCenter} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15 }} radius={1000}>
                                    <Popup>Moderate Warning — {searchedCity || 'Gwalior'}</Popup>
                                </Circle>
                            )}

                            {/* Safe Route Finder Implementation */}
                            {showSafeRoutes && (
                                <>
                                    {/* Blocked Road (Main Thoroughfare) */}
                                    <Polyline 
                                        positions={[
                                            [mapCenter[0] - 0.01, mapCenter[1] - 0.015],
                                            [mapCenter[0], mapCenter[1]],
                                            [mapCenter[0] + 0.015, mapCenter[1] + 0.01]
                                        ]} 
                                        pathOptions={{ color: '#ef4444', weight: 8, opacity: 0.7, dashArray: '10, 10' }}
                                    >
                                        <Popup>🚨 ROAD BLOCKED: Severe Waterlogging (2.5ft depth)</Popup>
                                    </Polyline>

                                    {/* Safe Elevated Route 1 */}
                                    <Polyline 
                                        positions={[
                                            [mapCenter[0] - 0.02, mapCenter[1] + 0.01],
                                            [mapCenter[0] - 0.005, mapCenter[1] + 0.02],
                                            [mapCenter[0] + 0.02, mapCenter[1] + 0.04]
                                        ]} 
                                        pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9 }}
                                    >
                                        <Popup>✅ SAFE ROUTE: Elevated Expressway Clear</Popup>
                                    </Polyline>

                                    {/* Safe Elevated Route 2 */}
                                    <Polyline 
                                        positions={[
                                            [mapCenter[0] + 0.02, mapCenter[1] - 0.02],
                                            [mapCenter[0] + 0.04, mapCenter[1] - 0.01]
                                        ]} 
                                        pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9 }}
                                    >
                                        <Popup>✅ SAFE ROUTE: Secondary Evacuation Path</Popup>
                                    </Polyline>
                                </>
                            )}
                            
                            {/* Fix map tile rendering */}
                            <InvalidateSize />
                            <FlyToCenter center={mapCenter} zoom={13} />
                        </MapContainer>
                    )}
                </div>

                {/* Impact Prediction & Safe Route Dashboard */}
                {result && impactStats && (
                    <div className="mt-4 animate-slide-up">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                                <Activity size={20} className="text-accent" />
                                {t('impact_report')}
                            </h5>
                            <div className="form-check form-switch">
                                <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    role="switch" 
                                    id="routeToggle" 
                                    checked={showSafeRoutes}
                                    onChange={(e) => setShowSafeRoutes(e.target.checked)}
                                />
                                <label className="form-check-label text-white-50 small" htmlFor="routeToggle">{t('safe_routes')}</label>
                            </div>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-3">
                                <div className="glass-panel p-3 border-danger border-opacity-25 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="bg-danger bg-opacity-10 p-2 rounded"><Home size={20} className="text-danger" /></div>
                                        <span className="small text-white-50">{t('homes_at_risk')}</span>
                                    </div>
                                    <h4 className="fw-bold text-white mb-0">{impactStats.houses.toLocaleString()}</h4>
                                    <div className="progress mt-2" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="progress-bar bg-danger" style={{ width: `${Math.min(100, (impactStats.houses/5000)*100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="glass-panel p-3 border-warning border-opacity-25 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="bg-warning bg-opacity-10 p-2 rounded"><Truck size={20} className="text-warning" /></div>
                                        <span className="small text-white-50">{t('roads_blocked')}</span>
                                    </div>
                                    <h4 className="fw-bold text-white mb-0">{impactStats.roads} km</h4>
                                    <div className="progress mt-2" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, (impactStats.roads/20)*100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="glass-panel p-3 border-info border-opacity-25 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="bg-info bg-opacity-10 p-2 rounded"><Navigation size={20} className="text-info" /></div>
                                        <span className="small text-white-50">{t('people_displaced')}</span>
                                    </div>
                                    <h4 className="fw-bold text-white mb-0">{impactStats.displaced.toLocaleString()}</h4>
                                    <div className="progress mt-2" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="progress-bar bg-info" style={{ width: `${Math.min(100, (impactStats.displaced/15000)*100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="glass-panel p-3 border-success border-opacity-25 h-100">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="bg-success bg-opacity-10 p-2 rounded"><Hospital size={20} className="text-success" /></div>
                                        <span className="small text-white-50">{t('hospitals')}</span>
                                    </div>
                                    <h4 className="fw-bold text-white mb-0">{impactStats.hospitals}</h4>
                                    <div className="progress mt-2" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="progress-bar bg-success" style={{ width: `${Math.min(100, (impactStats.hospitals/10)*100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
