import React from "react";
import { useNavigate } from "react-router-dom";

const QpShopPoster = () => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/qp-shop")}
      className="cursor-pointer bg-gradient-to-br from-indigo-600 to-indigo-400 
      p-6 rounded-2xl shadow-xl text-white max-w-xs hover:scale-[1.03] 
      transition-transform duration-300 mx-auto"
    >
      <h2 className="text-2xl font-extrabold mb-2 tracking-wide">
        You have <span className="text-yellow-300">50 QP</span>!
      </h2>

      <p className="text-base opacity-90">
        Check out which extras you could activate!
      </p>

      <div className="mt-4 text-sm font-semibold bg-white/20 py-2 px-3 rounded-xl w-fit">
        Go to QP Shop →
      </div>
    </div>
  );
};

export default QpShopPoster;
