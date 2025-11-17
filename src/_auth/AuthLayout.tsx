import { Outlet, Navigate } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isAuthenticated } = useUserContext();

  return (
    <>
      {isAuthenticated ? (
        <Navigate to="/" />
      ) : (
        <div className="flex flex-1 min-h-screen">
          {/* Section du formulaire */}
          <section className="flex flex-1 justify-center items-start flex-col py-10 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
            <Outlet />
          </section>

          {/* Image latérale (visible uniquement sur grand écran) */}
          <img
            src="/assets/images/side-imgg.png"
            alt="logo"
            className="hidden xl:block object-cover bg-no-repeat custom-img-size"
          />
        </div>
      )}
    </>
  );
}