import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AuthModalMode, AuthModalContextType } from "@/types";

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode | null>(null);

  const openAuthModal = useCallback((m: AuthModalMode) => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setMode(null);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};