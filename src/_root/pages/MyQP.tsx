import React, { useState, useEffect } from 'react';
import { useGetCurrentUser, useGetPointHistory } from '@/lib/react-query/queries';
import { getMaxPointsForLevel, getLevelName } from '@/lib/levelUtils';
import { ACTION_DISPLAY_NAMES, UserAction } from '@/lib/pointsMapping';
import { PointHistory } from '@/services/pointHistoryService';
import { useTranslation } from 'react-i18next';

interface PointsSection {
  id: string;
  action: 'Earned' | 'Lost';
  reason: string;
  points: number;
}

const MyQP = () => {
  const { t } = useTranslation();
  const { data: user, isLoading: userLoading, isError: userError } = useGetCurrentUser();
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useGetPointHistory(user?.$id || '');

  const [activeTab, setActiveTab] = useState<'earned' | 'lost' | 'overview'>('overview');
  const [animatedPoints, setAnimatedPoints] = useState(0);
  
  const level = user?.level;
  const levelName = getLevelName(level);
  const currentPoints = user?.point || 0;
  const maxPoints = getMaxPointsForLevel(level);
  const progressPercentage = maxPoints > 0 ? (currentPoints / maxPoints) * 100 : 0;

  // Animate points counter
  useEffect(() => {
    if (currentPoints > 0) {
      const duration = 2000;
      const steps = 60;
      const stepValue = currentPoints / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= currentPoints) {
          setAnimatedPoints(currentPoints);
          clearInterval(timer);
        } else {
          setAnimatedPoints(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [currentPoints]);

  // Normalize reason and map to display name
  const normalizeReason = (reason: string): string => {
    const normalized = reason.trim().toUpperCase().replace(/[-_]/g, '_');
    return ACTION_DISPLAY_NAMES[normalized as UserAction] || reason;
  };

  // Separate earned and lost points
  const earnedPoints: PointsSection[] = React.useMemo(() => {
    return (
      historyData?.pages
        ?.flatMap((page) => page.documents)
        .filter((record: PointHistory) => record.point > 0)
        .reduce((acc: PointsSection[], record: PointHistory) => {
          const reason = normalizeReason(record.reason);
          const existing = acc.find((item) => item.reason === reason);
          if (existing) {
            existing.points += record.point;
          } else {
            acc.push({ id: `earned-${record.$id}`, action: 'Earned', reason, points: record.point });
          }
          return acc;
        }, []) || []
    ).sort((a: any, b: any) => b.points - a.points);
  }, [historyData]);

  const lostPoints: any = React.useMemo(() => {
    return (
      historyData?.pages
        ?.flatMap((page) => page.documents)
        .filter((record: PointHistory) => record.point < 0)
        .map((record: PointHistory) => ({
          id: `lost-${record.$id}`,
          action: 'Lost',
          reason: normalizeReason(record.reason),
          points: record.point,
        })) || []
    ).sort((a, b) => a.points - b.points);
  }, [historyData]);

  const totalEarned = earnedPoints.reduce((sum, entry) => sum + entry.points, 0);
  const totalLost = Math.abs(lostPoints.reduce((sum:any, entry:any) => sum + entry.points, 0));

  if (userLoading || historyLoading) {
    return (
          <div className="min-h-screen min-w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary-500"></div>
      </div>
    );
  }

  if (userError || historyError) {
    return (
      <div className="min-h-screen bg-dark-1 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red/20 via-transparent to-pink-1/20"></div>
        <div className="relative z-10 max-w-2xl mx-auto pt-32">
          <div className="bg-dark-3/80 backdrop-blur-xl rounded-3xl p-8 border border-red/30 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-red/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-light-1 mb-4">{t("myQP.errorLoading")}</h2>
              <p className="text-light-3 mb-8">{t("myQP.errorLoading")}</p>
              <button
                className="px-8 py-4 bg-gradient-to-r from-red to-pink-1 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-red/25 transition-all duration-300 transform hover:scale-105"
                onClick={() => window.location.reload()}
              >
                {t("myQP.retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-1 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-bleu-1/20"></div>
        <div className="relative z-10 max-w-2xl mx-auto pt-32">
          <div className="bg-dark-3/80 backdrop-blur-xl rounded-3xl p-8 border border-primary-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-light-1 mb-4">Access Required</h2>
              <p className="text-light-3 mb-8">Please authenticate to access your points dashboard.</p>
              <a
                href="/login"
                className="inline-block px-8 py-4 bg-gradient-to-r from-primary-500 to-bleu-1 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Login to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-full bg-dark-1 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10"></div>


      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Futuristic Header */}
        <div className="mb-8">
          <div className="bg-dark-2/60 backdrop-blur-xl rounded-3xl p-8 border border-primary-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-bleu-1/10"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-center justify-between">
                <div className="flex items-center mb-6 lg:mb-0">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-bleu-1 p-1 animate-pulse">
                      <div className="w-full h-full rounded-full bg-dark-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary-500">L{level}</div>
                          <div className="text-xs text-light-3">LEVEL</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-4 h-4 text-dark-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-8">
                    <h1 className="text-5xl font-bold text-gray-800 dark:text-light-1 mb-2">
                      <span className="text-secondary-500">{animatedPoints.toLocaleString()}</span>
                      <span className="text-2xl ml-2 text-light-3">QP</span>
                    </h1>
                    <p className="text-xl text-light-3 mb-4">{levelName}</p>
                    <div className="w-80 h-4 bg-dark-4 rounded-full overflow-hidden border border-primary-500/30">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-pink-1 rounded-full transition-all duration-2000 ease-out shadow-lg"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-light-4 mt-2">
                      Progress: {progressPercentage.toFixed(1)}% • Next Level: {(maxPoints - currentPoints).toLocaleString()} QP
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-dark-3/80 rounded-2xl p-6 text-center border border-primary-500/20">
                    <div className="text-3xl font-bold text-primary-500 mb-2">{totalEarned.toLocaleString()}</div>
                    <div className="text-light-3 text-sm uppercase tracking-wide">{t("myQP.earned")}</div>
                  </div>
                  <div className="bg-dark-3/80 rounded-2xl p-6 text-center border border-red/20">
                    <div className="text-3xl font-bold text-red mb-2">{totalLost.toLocaleString()}</div>
                    <div className="text-light-3 text-sm uppercase tracking-wide">{t("myQP.lost")}</div>
                  </div>
                  <div className="bg-dark-3/80 rounded-2xl p-6 text-center border border-secondary-500/20">
                    <div className="text-3xl font-bold text-secondary-500 mb-2">{(totalEarned - totalLost).toLocaleString()}</div>
                    <div className="text-light-3 text-sm uppercase tracking-wide">{t("myQP.currentBalance")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-dark-2/60 backdrop-blur-xl rounded-2xl p-2 border border-primary-500/20 inline-flex">
            {(['overview', 'earned', 'lost'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-primary-500 to-bleu-1 text-white shadow-lg'
                    : 'text-light-3 hover:text-gray-800 dark:text-light-1 hover:bg-dark-3/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-2/60 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20">
                <h3 className="text-xl font-bold text-gray-800 dark:text-light-1 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 animate-pulse"></div>
                  {t("myQP.topEarningSources")}
                </h3>
                <div className="space-y-3">
                  {earnedPoints.slice(0, 5).map((entry, index) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-dark-3/50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-primary-500 font-bold text-sm">{index + 1}</span>
                        </div>
                        <span className="text-gray-800 dark:text-light-1">{entry.reason}</span>
                      </div>
                      <span className="text-primary-500 font-bold">+{entry.points.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-dark-2/60 backdrop-blur-xl rounded-2xl p-6 border border-red/20">
                <h3 className="text-xl font-bold text-gray-800 dark:text-light-1 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-red rounded-full mr-3 animate-pulse"></div>
                  {t("myQP.recentLosses")}
                </h3>
                <div className="space-y-3">
                  {lostPoints.slice(0, 5).map((entry: any, index: any) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-dark-3/50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red/20 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-red font-bold text-sm">{index + 1}</span>
                        </div>
                        <span className="text-gray-800 dark:text-light-1">{entry.reason}</span>
                      </div>
                      <span className="text-red font-bold">{entry.points.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earned' && (
            <div className="bg-dark-2/60 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-light-1 mb-6">{t("myQP.earned")}</h3>
              {earnedPoints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {earnedPoints.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="bg-dark-3/80 rounded-xl p-5 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-primary-500/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-bleu-1 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-500">+{entry.points.toLocaleString()}</div>
                          <div className="text-light-4 text-sm">QP</div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-light-1 mb-2">{entry.reason}</h4>
                      <p className="text-light-3 text-sm">{entry.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-light-1 mb-2">No Points Earned Yet</h4>
                  <p className="text-light-3">Start engaging with the platform to earn your first points!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lost' && (
            <div className="bg-dark-2/60 backdrop-blur-xl rounded-2xl p-6 border border-red/20">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-light-1 mb-6">{t("myQP.lost")}</h3>
              {lostPoints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lostPoints.map((entry: any, index: any) => (
                    <div
                      key={entry.id}
                      className="bg-dark-3/80 rounded-xl p-5 border border-red/20 hover:border-red/40 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red to-pink-1 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red">{entry.points.toLocaleString()}</div>
                          <div className="text-light-4 text-sm">QP</div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-light-1 mb-2">{entry.reason}</h4>
                      <p className="text-light-3 text-sm">{entry.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-light-1 mb-2">No Points Lost</h4>
                  <p className="text-light-3">Excellent! You haven't lost any points yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyQP;