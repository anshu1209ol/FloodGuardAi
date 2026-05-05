import React, { useContext } from 'react';
import { ShieldCheck, AlertTriangle, Activity, Info } from 'lucide-react';
import { GlobalStateContext } from '../App';

export default function AlertCenter() {
    const { alertHistory } = useContext(GlobalStateContext);

    return (
        <div className="container text-white px-3">
            <div className="mb-4">
                <h3 className="fw-bold mb-0">Alert Center & Documentation</h3>
                <p className="text-white-50">Event Logs and Operational Procedures</p>
            </div>

            <div className="row g-4">
                {/* Alert History */}
                <div className="col-lg-7">
                    <div className="glass-panel p-4 h-100">
                        <h5 className="mb-4 d-flex align-items-center gap-2 border-bottom border-secondary pb-2">
                            <Activity size={20}/> Threat Log (Simulated Events)
                        </h5>
                        
                        {alertHistory.length === 0 ? (
                            <div className="text-center p-5 text-white-50">
                                <ShieldCheck size={48} className="mb-3 opacity-50" />
                                <h5>No Critical Threats Detected</h5>
                                <p className="small">System is operating within normal parameters.</p>
                            </div>
                        ) : (
                            <div className="overflow-auto pe-2" style={{ maxHeight: '60vh' }}>
                                {alertHistory.map((alert, index) => (
                                    <div key={index} className="p-3 mb-3 border border-secondary rounded d-flex justify-content-between align-items-center bg-dark bg-opacity-50 transition-all hover-nav-item">
                                        <div className="d-flex align-items-center gap-3">
                                            {alert.severity === 'High' ? (
                                                <AlertTriangle size={24} className="text-danger glow-icon" />
                                            ) : (
                                                <AlertTriangle size={24} className="text-warning" />
                                            )}
                                            <div>
                                                <div className="fw-bold fs-5">{alert.location}</div>
                                                <div className="small text-white-50">{alert.time}</div>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <div className="fw-bold" style={{ color: alert.severity === 'High' ? '#ef4444' : '#f59e0b' }}>
                                                {alert.severity.toUpperCase()} RISK
                                            </div>
                                            <div className="small text-white-50">Probability: {alert.probability}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Documentation */}
                <div className="col-lg-5">
                    <div className="glass-panel p-4 h-100">
                        <h5 className="mb-4 d-flex align-items-center gap-2 border-bottom border-secondary pb-2">
                            <Info size={20}/> Response Protocols
                        </h5>
                        
                        <div className="d-flex flex-column gap-3">
                            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}>
                                <h6 className="fw-bold text-danger d-flex align-items-center gap-2">
                                    <AlertTriangle size={16}/> HIGH Severity 🔴
                                </h6>
                                <p className="small text-white-50 mb-2">
                                    <strong>Protocol:</strong> Immediate action required. Threshold &gt; 65%.
                                    <br/>- Initiate automated SMS/Email alerts.
                                    <br/>- Safe routes automatically computed.
                                </p>
                                <button className="btn btn-sm btn-danger w-100 py-1 fw-bold" onClick={() => alert('🚨 BROADCAST SENT: SMS Alerts pushed to affected zone.')}>
                                    SIMULATE BROADCAST
                                </button>
                            </div>

                            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b' }}>
                                <h6 className="fw-bold text-warning d-flex align-items-center gap-2">
                                    <AlertTriangle size={16}/> MODERATE Severity 🟡
                                </h6>
                                <p className="small text-white-50 mb-0">
                                    <strong>Protocol:</strong> Heightened readiness.
                                    <br/>- Issue advisory warnings to residents.
                                    <br/>- Monitor river gauges every 15 minutes.
                                    <br/>- Prepare emergency shelters and verify supply chains.
                                </p>
                            </div>

                            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981' }}>
                                <h6 className="fw-bold text-success d-flex align-items-center gap-2">
                                    <ShieldCheck size={16}/> LOW / SAFE 🟢
                                </h6>
                                <p className="small text-white-50 mb-0">
                                    <strong>Protocol:</strong> Standard monitoring.
                                    <br/>- Maintain routine sensor polling.
                                    <br/>- Proceed with scheduled infrastructure maintenance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
