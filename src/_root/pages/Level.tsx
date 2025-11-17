import LostPoints from '@/components/level/LostPoints';
import PointsEarned from '@/components/level/PointsEarned';
import XperPointsCircle from '@/components/level/XperPointsCircle';
import { useGetCurrentUser, useGetPointHistory } from '@/lib/react-query/queries';
import { getMaxPointsForLevel, getLevelName } from '@/lib/levelUtils';
import { ACTION_DISPLAY_NAMES, UserAction } from '@/lib/pointsMapping';
import React from 'react';
import { PointHistory } from '@/services/pointHistoryService';
import { useTranslation } from 'react-i18next';

interface PointsSection {
  reason: string;
  points: number;
}

const Level: React.FC = () => {
  const { t } = useTranslation();
  const { data: user, isLoading: userLoading, isError: userError } = useGetCurrentUser();
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useGetPointHistory(user?.$id || '');

  const level = user?.level || 1;
  const levelName = getLevelName(level);
  const currentPoints = user?.point || 0;
  const maxPoints = getMaxPointsForLevel(level);

  // Normalize reason and map to display name
  const normalizeReason = (reason: string): string => {
    const normalized = reason.trim().toUpperCase().replace(/[-_]/g, '_');
    return ACTION_DISPLAY_NAMES[normalized as UserAction] || reason;
  };

  const lostPointsData = historyData?.pages
    ?.flatMap((page) => page.documents)
    .filter((record: PointHistory) => record.point < 0)
    .map((record: PointHistory) => ({
      reason: normalizeReason(record.reason),
      points: record.point,
    })) || [];

  const pointsEarnedData: PointsSection[] = historyData?.pages
    ?.flatMap((page) => page.documents)
    .filter((record: PointHistory) => record.point > 0)
    .reduce((acc: PointsSection[], record: PointHistory) => {
      const reason = normalizeReason(record.reason);
      const existing = acc.find((item) => item.reason === reason);
      if (existing) {
        existing.points += record.point;
      } else {
        acc.push({ reason, points: record.point });
      }
      return acc;
    }, []) || [];

  if (userLoading || historyLoading) {
    return <div className="container mx-auto mt-60 p-6">{t("level.loading")}</div>;
  }

  if (userError || historyError) {
    return <div className="container mx-auto mt-60 p-6">{t("level.errorLoading")}</div>;
  }

  if (!user) {
    return <div className="container mx-auto mt-60 p-6">{t("level.pleaseLogin")}</div>;
  }

  return (
    <div className="container mx-auto mt-60 p-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">{t("level.levelTitle")} {levelName}</h2>
      </div>
      <div className="flex justify-center">
      <XperPointsCircle level={level} levelName={levelName} currentPoints={currentPoints} maxPoints={maxPoints} />
      </div>
      <div className="flex gap-4 mt-8">
        <div className="flex-1">
          <LostPoints pointsData={lostPointsData} />
        </div>
        <div className="flex-1">
          <PointsEarned sections={pointsEarnedData} />
        </div>
      </div>
    </div>
  );
};

export default Level;