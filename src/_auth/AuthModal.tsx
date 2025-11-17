import { useEffect, useRef } from "react";
import { useAuthModal } from "@/context/AuthModalContext";
import SigninForm from "./forms/SigninForm";
import SignupForm from "./forms/SignupForm";
import ForgotPasswordForm from "./forms/ForgotPasswordForm";
import BusinessApplicationForm from "./forms/BusinessApplicationForm";

const AuthModal = () => {
  const { isOpen, mode, closeAuthModal } = useAuthModal();
  const modalRef = useRef<HTMLDivElement>(null);

  // Log modal state for debugging
  useEffect(() => {
  }, [isOpen, mode]);

  // Close modal on Escape key press and trap focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAuthModal();
      }
    };

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keydown", handleFocusTrap);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
      modalRef.current?.focus(); // Focus modal on open
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleFocusTrap);
      document.body.style.overflow = "auto"; // Restore scrolling
    };
  }, [isOpen, closeAuthModal]);

  if (!isOpen || !mode) {
    return null;
  }

  let FormComponent: any;
  let title: string;
  switch (mode) {
    case "signin":
      FormComponent = SigninForm;
      title = "Log in to your account";
      break;
    case "signup":
      FormComponent = SignupForm;
      title = "Create a new account";
      break;
    case "forgot-password":
      FormComponent = ForgotPasswordForm;
      title = "Reset Your Password";
      break;
    case "business":
      FormComponent = BusinessApplicationForm;
      title = "Apply for Business Account";
      break;
    default:
      return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-dark-1/80 backdrop-blur-lg transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-dark-3/90 p-6 sm:p-8 rounded-xl shadow-xl max-w-md sm:max-w-lg w-full mx-4 relative overflow-y-auto max-h-[90vh] custom-scrollbar transform transition-all duration-300 ease-out"
        style={{ backdropFilter: "blur(10px)" }}
        tabIndex={-1}
      >
        <h2 id="auth-modal-title" className="text-light-1 text-2xl font-bold mb-4 text-center font-inter">
          {title}
        </h2>
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 text-light-3 hover:text-primary-500 rounded-full bg-dark-4/50 hover:bg-dark-4/80 transition-colors duration-200"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <FormComponent isModal={true} />
      </div>
    </div>
  );
};

export default AuthModal;