import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeIcons } from '../utils/themeUtils';

interface AnalyticsSummary {
    total_writings: number;
    average_score: number;
    total_interactions: number;
    current_level: number;
    total_points: number;
}

function Header() {
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const { currentTheme } = useTheme();
    const themeIcons = getThemeIcons(currentTheme);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get('http://localhost:8000/analytics/summary');
                setAnalytics(response.data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <header className={`bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white p-4 shadow-lg sticky top-0 z-30`}>
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">{currentTheme.emoji}</span>
                    <h1 className="text-2xl md:text-3xl font-bold">
                        Kids<span className="text-white/80">Progress</span>
                    </h1>
                    <span className="text-2xl">{themeIcons.success}</span>
                </div>
                <div className="hidden md:flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                        <span>{currentTheme.name === 'universe' ? '🏆' : '🌟'}</span>
                        <span>Level {analytics?.current_level || 1}</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                        <span>{themeIcons.loading}</span>
                        <span>{analytics?.total_points || 0} Points</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                        <span>{themeIcons.writing}</span>
                        <span>{analytics?.total_writings || 0} Stories</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
export default Header;