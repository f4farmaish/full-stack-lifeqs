import { useTranslation } from "react-i18next";

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="sm:w-420 flex-center flex-col p-6 home-container">
      <h1 className="h3-bold md:h2-bold">{t("privacyPolicy.title")}</h1>
      <p className="text-light-3 small-medium md:base-regular mt-2">
        {t("privacyPolicy.lastUpdated")}
      </p>
      <div className="mt-4 text-light-1">
        <h2 className="h4-bold">{t("privacyPolicy.section1Title")}</h2>
        <p>
          {t("privacyPolicy.section1Content")}
        </p>
        <h2 className="h4-bold mt-4">{t("privacyPolicy.section2Title")}</h2>
        <p>
          {t("privacyPolicy.section2Content")}
        </p>
        <h2 className="h4-bold mt-4">{t("privacyPolicy.section3Title")}</h2>
        <p>
          {t("privacyPolicy.section3Content")}
        </p>
        <h2 className="h4-bold mt-4">{t("privacyPolicy.section6Title")}</h2>
        <p>
          {t("privacyPolicy.section6Content")}
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;