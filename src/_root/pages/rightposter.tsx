import React from "react";
import { useNavigate } from "react-router-dom";

const ProfileUpgradePoster = () => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/all-cards")}
      className="cursor-pointer bg-gradient-to-br from-emerald-600 to-emerald-400 
      p-6 rounded-2xl shadow-xl text-white max-w-xs hover:scale-[1.03] 
      transition-transform duration-300 mx-auto"
    >
      <h2 className="text-2xl font-extrabold mb-2 tracking-wide">
        Upgrade your profile!
      </h2>

      <p className="text-base opacity-90">
        Unlock more perks and exclusive features.
      </p>

      <div className="mt-4 text-sm font-semibold bg-white/20 py-2 px-3 rounded-xl w-fit">
        See Available Upgrades →
      </div>
    </div>
  );
};

export default ProfileUpgradePoster;
