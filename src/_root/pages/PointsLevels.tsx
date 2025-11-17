import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PointsLevels: React.FC = () => {
  const { t } = useTranslation();

  const levels = [
    { level: 1, points: '0-100', benefits: 'Basic access: Post & comment' },
    { level: 2, points: '101-500', benefits: 'Unlock polls & groups' },
    { level: 3, points: '501-2000', benefits: 'Priority notifications & badges' },
    { level: 4, points: '2001+', benefits: 'Admin tools & custom themes' },
  ];

  return (
    <div className="min-h-screen bg-dark-2 text-light-1 py-8 px-4 home-container">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-12">{t("pointsLevels.title")}</h1>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">{t("pointsLevels.howToEarn")}</h2>
          <ul className="list-disc list-inside space-y-2 text-light-2 mb-8">
            <li>{t("pointsLevels.comment")} - {t("pointsLevels.commentPoints")}</li>
            <li>{t("pointsLevels.vote")} - {t("pointsLevels.votePoints")}</li>
            <li>{t("pointsLevels.postQuestion")} - {t("pointsLevels.postQuestionPoints")}</li>
            <li>{t("pointsLevels.postPoll")} - {t("pointsLevels.postPollPoints")}</li>
          </ul>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">{t("pointsLevels.levelBenefits")}</h2>
          <table className="w-full bg-dark-3 border border-dark-4 rounded-md">
            <thead>
              <tr className="border-b border-dark-4">
                <th className="p-3 text-left text-light-1">{t("pointsLevels.level")}</th>
                <th className="p-3 text-left text-light-1">{t("pointsLevels.maxPostsPer24h")}</th>
                <th className="p-3 text-left text-light-1">{t("pointsLevels.perks")}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(l => (
                <tr key={l.level} className="border-b border-dark-4">
                  <td className="p-3 text-light-2">{t("pointsLevels.level")} {l.level}</td>
                  <td className="p-3 text-light-2">{l.points}</td>
                  <td className="p-3 text-light-2">{l.benefits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <Link
          to="/profile/:id"
          className="bg-secondary-500 hover:bg-secondary-500/80 text-dark-1 px-8 py-3 rounded-md font-medium inline-block"
        >
          {t("myLevel.title")}
        </Link>
      </div>
    </div>
  );
};

export default PointsLevels;