import React, { useEffect } from "react";
import ContactForm from "@/components/forms/ContactForm";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const Advertise: React.FC = () => {
  const { t } = useTranslation();
  const [showContactForm, setShowContactForm] = useState(false);

  const opportunities = [
    { type: t('advertise.opportunity1Type'), desc: t('advertise.opportunity1Desc') },
    { type: t('advertise.opportunity2Type'), desc: t('advertise.opportunity2Desc') },
    { type: t('advertise.opportunity3Type'), desc: t('advertise.opportunity3Desc') },
    { type: t('advertise.opportunity4Type'), desc: t('advertise.opportunity4Desc') },
  ];

  return (
    <div className="min-h-screen bg-dark-2 text-light-1 py-8 px-4 home-container">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-12">
          {t('advertise.title')}
        </h1>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">
            {t('advertise.subtitle')}
          </h2>
          <p className="text-light-2 mb-6">
            {t('advertise.description')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-light-2">
            {opportunities.map((op) => (
              <li key={op.type}>
                {op.type}: {op.desc}
              </li>
            ))}
          </ul>
        </section>
        <section className="mb-12"></section>
        <button
          onClick={() => setShowContactForm(true)}
          className="bg-bleu-1 hover:bg-bleu-1/80 text-light-1 px-8 py-3 rounded-md font-medium">
          {t('advertise.contactButton')}
        </button>
      </div>
      {showContactForm && (
        <ContactForm onClose={() => setShowContactForm(false)} />
      )}
    </div>
  );
};

export default Advertise;
