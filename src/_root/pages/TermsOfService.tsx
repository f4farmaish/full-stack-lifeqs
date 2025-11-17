import React from 'react';
import { useTranslation } from 'react-i18next';

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-dark-2 text-light-1 py-8 px-4 home-container">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{t("termsOfService.title")}</h1>
        <p className="text-light-3 mb-6">{t("termsOfService.lastUpdated")}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section1Title")}</h2>
          <p className="text-light-2 mb-4">
            {t("termsOfService.section1Content")}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section2Title")}</h2>
          <p className="text-light-2 mb-4">
            {t("termsOfService.section2Content")}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section3Title")}</h2>
          <p className="text-light-2 mb-4">
            {t("termsOfService.section3Content")}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section4Title")}</h2>
          <ol className="list-decimal list-inside space-y-2 text-light-2 pl-4">
            <li>{t("termsOfService.section4Item1")}</li>
            <li>{t("termsOfService.section4Item2")}</li>
            <li>{t("termsOfService.section4Item3")}</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section5Title")}</h2>
          <p className="text-light-2 mb-4">
            {t("termsOfService.section5Content")}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section6Title")}</h2>
          <p className="text-light-2">
            {t("termsOfService.section6Content")}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t("termsOfService.section7Title")}</h2>
          <p className="text-light-2">
            {t("termsOfService.section7Content")}
          </p>
        </section>

        <p className="text-light-3 text-center mt-8">
          {t("termsOfService.footer")}
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;