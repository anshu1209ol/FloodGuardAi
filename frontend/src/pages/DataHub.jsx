import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Info, BarChart2, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DataHub() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate data loading
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const downloadCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,Feature,ImpactLevel\nMonsoonIntensity,High\nTopographyDrainage,Medium\nRiverManagement,Critical";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "flood_data_snapshot.csv");
        document.body.appendChild(link);
        link.click();
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#f8fafc' } },
            title: { display: false }
        },
        scales: {
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
    };

    const chartData = {
        labels: ['Rainfall Intensity', 'River Capacity', 'Urbanization', 'Deforestation', 'Drainage Quality'],
        datasets: [
            {
                label: 'Average Feature Value in Dataset',
                data: [7.2, 5.1, 8.4, 6.7, 4.2],
                backgroundColor: 'rgba(56, 189, 248, 0.7)',
                borderColor: '#38bdf8',
                borderWidth: 1,
            }
        ],
    };

    return (
        <div className="container text-white px-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-0">{t('data_analysis_hub')}</h3>
                    <p className="text-white-50">{t('data_insights')}</p>
                </div>
                <button onClick={downloadCSV} className="btn btn-outline-info d-flex align-items-center gap-2">
                    <Download size={18} /> {t('download_snapshot')}
                </button>
            </div>

            {loading ? (
                <div className="row g-4">
                    <div className="col-12"><div className="shimmer rounded" style={{height: '300px'}}></div></div>
                    <div className="col-md-6"><div className="shimmer rounded" style={{height: '200px'}}></div></div>
                    <div className="col-md-6"><div className="shimmer rounded" style={{height: '200px'}}></div></div>
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-12">
                        <div className="glass-panel p-4">
                            <h5 className="mb-4 d-flex align-items-center gap-2"><BarChart2 size={20}/> {t('feature_distribution')}</h5>
                            <div style={{ height: '300px' }} className="d-flex justify-content-center">
                                <Bar options={chartOptions} data={chartData} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-6">
                        <div className="glass-panel p-4 h-100">
                            <h5 className="mb-3 d-flex align-items-center gap-2"><Info size={20}/> {t('key_factors')}</h5>
                            <ul className="list-group list-group-flush bg-transparent">
                                <li className="list-group-item bg-transparent text-white border-secondary px-0">
                                    <strong className="text-accent">Monsoon Intensity:</strong> Predicts soil saturation. High intensity overpowers natural absorption.
                                </li>
                                <li className="list-group-item bg-transparent text-white border-secondary px-0">
                                    <strong className="text-accent">River Management:</strong> Indicates infrastructure capacity to handle sudden swells.
                                </li>
                                <li className="list-group-item bg-transparent text-white border-secondary px-0">
                                    <strong className="text-accent">Deforestation:</strong> Lack of root systems increases runoff speed and landslide probability.
                                </li>
                                <li className="list-group-item bg-transparent text-white border-secondary px-0">
                                    <strong className="text-accent">Drainage Systems:</strong> Critical in urban zones to prevent flash water logging.
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="glass-panel p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center">
                            <h5 className="mb-3 w-100 text-start d-flex align-items-center gap-2"><Activity size={20}/> {t('correlation_heatmap')}</h5>
                            <div className="w-100 p-4 border border-secondary rounded" style={{ background: 'linear-gradient(45deg, rgba(239, 68, 68, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)' }}>
                                <p className="text-white-50 mb-0">{t('heatmap_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
