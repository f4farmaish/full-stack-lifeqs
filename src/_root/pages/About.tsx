import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-dark-2 text-light-1 py-8 px-4 home-container">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary-500 mb-4">{t('about.heroTitle')}</h1>
          <p className="text-light-3 text-lg">{t('about.heroSubtitle')}</p>
        </section>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-light-1 mb-6">{t('about.missionTitle')}</h2>
          <p className="text-light-2 leading-relaxed">
            {t('about.missionContent')}
          </p>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-light-1 mb-6">{t('about.featuresTitle')}</h2>
          <ul className="grid md:grid-cols-2 gap-6 text-light-2">
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature1')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature2')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature3')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature4')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature5')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>{t('about.feature6')}</span>
            </li>
          </ul>
        </section>

        {/* Stats */}
        <section className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-light-1 mb-6">{t('about.statsTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-secondary-500">{t('about.stat1Value')}</div>
              <p className="text-light-3">{t('about.stat1Label')}</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary-500">{t('about.stat2Value')}</div>
              <p className="text-light-3">{t('about.stat2Label')}</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary-500">{t('about.stat3Value')}</div>
              <p className="text-light-3">{t('about.stat3Label')}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Link
            to="/sign-up"
            className="bg-primary-600 hover:bg-primary-500 text-light-1 px-8 py-3 rounded-md font-medium inline-block"
          >
            {t('about.ctaButton')}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default About;