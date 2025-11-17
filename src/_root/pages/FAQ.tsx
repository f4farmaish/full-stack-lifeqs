import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQ: React.FC = () => {
  const { t } = useTranslation();

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const faqs = [
    { id: 'getting-started-1', q: t('faq.q1'), a: t('faq.a1') },
    { id: 'getting-started-2', q: t('faq.q2'), a: t('faq.a2') },
    { id: 'content-1', q: t('faq.q3'), a: t('faq.a3') },
    { id: 'content-2', q: t('faq.q4'), a: t('faq.a4') },
    { id: 'groups-1', q: t('faq.q5'), a: t('faq.a5') },
    { id: 'polls-1', q: t('faq.q6'), a: t('faq.a6') },
    { id: 'notifications-1', q: t('faq.q7'), a: t('faq.a7') },
    { id: 'safety-1', q: t('faq.q8'), a: t('faq.a8') },
    { id: 'safety-2', q: t('faq.q9'), a: t('faq.a9') },
    { id: 'gamification-1', q: t('faq.q10'), a: t('faq.a10') },
    { id: 'business-1', q: t('faq.q11'), a: t('faq.a11') },
    { id: 'support-1', q: t('faq.q12'), a: t('faq.a12') },
    { id: 'support-2', q: t('faq.q13'), a: t('faq.a13') },
    { id: 'support-3', q: t('faq.q14'), a: t('faq.a14') },
  ];

  const categories = {
    'getting-started': faqs.slice(0, 2),
    'content': faqs.slice(2, 4),
    'groups': faqs.slice(4, 5),
    'polls': faqs.slice(5, 6),
    'notifications': faqs.slice(6, 7),
    'safety': faqs.slice(7, 9),
    'gamification': faqs.slice(9, 10),
    'business': faqs.slice(10, 11),
    'support': faqs.slice(11),
  };

  return (
    <div className="min-h-screen bg-dark-2 text-light-1 py-8 px-4 home-container">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-12">{t('faq.title')}</h1>
        {Object.entries(categories).map(([cat, items]) => (
          <section key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-light-1 mb-4 capitalize">{t(`faq.${cat.replace('-', '')}`)}</h2>
            {items.map(faq => (
              <div key={faq.id} className="bg-dark-3 border border-dark-4 rounded-md mb-4">
                <button
                  onClick={() => toggleSection(faq.id)}
                  className="w-full text-left p-4 font-medium hover:bg-dark-4 rounded-md"
                >
                  {faq.q}
                  <span className={`float-right ${openSections[faq.id] ? 'rotate-180' : ''} transition-transform`}>
                    ▼
                  </span>
                </button>
                {openSections[faq.id] && (
                  <div className="p-4 pt-0 text-light-2 text-sm border-t border-dark-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};

export default FAQ;