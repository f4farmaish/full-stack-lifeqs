import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ContactForm from "@/components/forms/ContactForm";
import { useTheme } from "@/context/ThemeContext";

interface InformativeBottomBarProps {
  isVisible: boolean;
}

const InformativeBottomBar: React.FC<InformativeBottomBarProps> = ({
  isVisible,
}) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleContactClick = () => {
    setShowContactForm(true);
  };

  return (
    <>
      {/* Bottom Bar with smooth transitions */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 bg-dark-2 text-light-1 shadow-lg z-40 border-t border-dark-4
          transform transition-transform duration-300 ease-in-out
          ${isVisible ? "translate-y-0" : "translate-y-full"}
        `}>
        {/* Main bar */}
        <div className="flex flex-wrap justify-center items-center p-3 space-x-1 text-xs">
          {/* Links */}
          <Link
            to="/about"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.aboutUs")}
          </Link>

          <span className="text-light-4">|</span>

          <button
            onClick={handleContactClick}
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.contactUs")}
          </button>

          <span className="text-light-4">|</span>

          <Link
            to="/faq"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.faq")}
          </Link>

          <span className="text-light-4">|</span>

          <Link
            to="/points-levels"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.pointsLevels")}
          </Link>

          <span className="text-light-4">|</span>

          <Link
            to="/terms-of-service"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.termsOfUse")}
          </Link>

          <span className="text-light-4">|</span>

          <Link
            to="/privacy-policy"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.privacyPolicy")}
          </Link>

          <span className="text-light-4">|</span>

          <Link
            to="/advertise"
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors">
            {t("informativeBottomBar.advertiseWithUs")}
          </Link>

          <span className="text-light-4">|</span>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="px-2 py-1 hover:bg-dark-3 rounded transition-colors flex items-center gap-1"
            title={
              theme === "light"
                ? t("informativeBottomBar.switchToDarkMode")
                : t("informativeBottomBar.switchToLightMode")
            }>
            <span className="text-sm">{theme === "light" ? "🌙" : "☀️"}</span>
            {theme === "light"
              ? t("informativeBottomBar.darkMode")
              : t("informativeBottomBar.lightMode")}
          </button>

          <span className="text-light-4">|</span>

          {/* Social Media Icons */}
          <div className="flex items-center space-x-2 ml-2">
            <a
              href="https://facebook.com/yourpage"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-dark-3 rounded transition-colors"
              title="Facebook">
              <svg
                className="w-4 h-4 fill-current text-light-1"
                viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            <a
              href="https://instagram.com/yourpage"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-dark-3 rounded transition-colors"
              title="Instagram">
              <svg
                className="w-4 h-4 fill-current text-light-1"
                viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.40z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactForm onClose={() => setShowContactForm(false)} />
      )}
    </>
  );
};

export default InformativeBottomBar;
