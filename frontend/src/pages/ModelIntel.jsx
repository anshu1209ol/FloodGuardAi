import React, { useState, useEffect } from 'react';
import { Brain, Target, AlertCircle } from 'lucide-react';

export default function ModelIntel() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="container text-white px-3">
            <div className="mb-4">
                <h3 className="fw-bold mb-0">Model Intelligence</h3>
                <p className="text-white-50">Random Forest Architecture & Performance Metrics</p>
            </div>

            {loading ? (
                <div className="row g-4">
                    <div className="col-12"><div className="shimmer rounded" style={{height: '400px'}}></div></div>
                </div>
            ) : (
                <div className="row g-4">
                    {/* Architecture Viz */}
                    <div className="col-lg-8">
                        <div className="glass-panel p-4 h-100">
                            <h5 className="mb-4 d-flex align-items-center gap-2"><Brain size={20}/> Random Forest Architecture</h5>
                            <div className="rounded overflow-hidden border border-secondary mb-3 bg-dark d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                                <img src="/rf_viz.png" alt="Random Forest Visualization" className="img-fluid opacity-75" style={{ objectFit: 'cover', width: '100%', maxHeight: '400px' }} />
                            </div>
                            <p className="text-white-50">
                                The FloodGuard AI utilizes a <strong>Random Forest Regressor</strong> algorithm. It operates by constructing a multitude of decision trees during training time and outputting the mean prediction of the individual trees. This ensemble method is highly robust against overfitting and handles non-linear relationships in environmental datasets exceptionally well.
                            </p>
                        </div>
                    </div>

                    {/* Metrics and Limitations */}
                    <div className="col-lg-4 d-flex flex-column gap-4">
                        <div className="glass-panel p-4">
                            <h5 className="mb-3 d-flex align-items-center gap-2"><Target size={20}/> Accuracy Metrics</h5>
                            <div className="d-flex flex-column gap-3">
                                <div>
                                    <div className="small text-white-50">R² Score (Coefficient of Determination)</div>
                                    <div className="fs-2 fw-bold text-success">0.844</div>
                                    <div className="progress mt-1" style={{height: '4px'}}>
                                        <div className="progress-bar bg-success" role="progressbar" style={{width: '84.4%'}}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="small text-white-50">Mean Absolute Error (MAE)</div>
                                    <div className="fs-2 fw-bold text-accent">0.015</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-4 border-danger flex-grow-1" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <h5 className="mb-3 d-flex align-items-center gap-2 text-danger"><AlertCircle size={20}/> Model Limitations</h5>
                            <ul className="text-white-50 small mb-0 ps-3">
                                <li className="mb-2"><strong>Sudden Structural Failure:</strong> Does not account for immediate dam breaches or levee collapses outside gradual wear.</li>
                                <li className="mb-2"><strong>Real-time Micro-weather:</strong> Localized cloudbursts under 5km² resolution may not be accurately captured by the regional sensors.</li>
                                <li><strong>Historical Bias:</strong> Extreme events that eclipse historical maximums may be under-predicted due to tree-based bounding constraints.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
