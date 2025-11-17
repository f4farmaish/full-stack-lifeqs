import {
  Route,
  Routes,
  Link,
  Outlet,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaWallet, FaTag, FaPlus, FaPaperPlane } from "react-icons/fa6"; 
import { Button } from "@/components/ui";
import {
  LikedPosts,
  Saved,
  AllCards,
  MyCards,
  History,
} from "@/_root/pages";
import MyLevel from "@/_root/pages/MyLevel";
import MyQP from "@/_root/pages/MyQP";
import QPShop from "@/_root/pages/QPShop";

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> FIX APPLIED HERE <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// The previous code was missing this crucial import, causing "useUserContext is not defined"
import { useUserContext } from "@/context/AuthContext"; 
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

import {
  useBlockUser,
  useGetUserById,
  useGetUserGroups,
  useGetUserPolls,
  useGetUserPosts,
  useIsBlocked,
  useDecreaseWalletBalance,
  useGetUserDrafts,
} from "@/lib/react-query/queries";
import { createTransaction } from "@/services/TransactionHistoryService"; 
import { Loader } from "@/components/shared";
import BlockedUsersList from "@/components/shared/BlockedUsersList";
import PaymentPopup from "@/components/profile/PaymentPopup";
import UserPosts from "./UserPosts";
import UserGroups from "./UserGroups";
import { formatTimeDifference } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { Card, UserDetails } from "@/types";
import { cardsData } from "@/_root/data/cardsData";
import { useQueryClient } from "@tanstack/react-query";
import { badges } from "@/constants/badges";
import ColoredAvatar from "@/components/shared/ColoredAvatar";


// --- START: Mocked MyGroups Component (Kept for continuity) ---

interface MyGroupsProps {
    currentFilter: "joined" | "created" | "requests" | null;
    onFilterChange: (filter: "joined" | "created" | "requests" | null) => void;
}

const MyGroups = ({ currentFilter, onFilterChange }: MyGroupsProps) => {
    const { t } = useTranslation();

    // Helper function to get translated text with a strong English fallback
    const getT = (key: string, fallback: string) => t(key, { defaultValue: fallback });

    return (
        <div className="flex flex-col w-full px-2 mt-[30px]">
            <div className="flex flex-wrap gap-4 pt-4 pb-4 border-b border-dark-4 pl-[150px]">
                {/* Joined Groups Button - FIX 1: Added spacing (gap-4) and robust translation */}
                <button
                    onClick={() => onFilterChange("joined")}
                    className={`flex items-center gap-2 p-3 text-sm font-semibold rounded-lg transition ${
                        currentFilter === "joined" || currentFilter === null
                            ? "bg-dark-3 text-primary-500 border border-primary-500"
                            : "bg-dark-4 text-light-2 hover:bg-dark-3"
                    }`}
                >
                    <FaPaperPlane className="w-4 h-4" />
                    {getT("myGroups.joinedGroups", "Joined Groups")}
                </button>

                {/* Created Groups Button - FIX 2: Added spacing and robust translation */}
                <button
                    onClick={() => onFilterChange("created")}
                    className={`flex items-center gap-2 p-3 text-sm font-semibold rounded-lg transition ${
                        currentFilter === "created"
                            ? "bg-dark-3 text-primary-500 border border-primary-500"
                            : "bg-dark-4 text-light-2 hover:bg-dark-3"
                    }`}
                >
                    <FaPlus className="w-4 h-4" />
                    {getT("myGroups.createdGroups", "Created Groups")}
                </button>

                {/* Membership Requests Button - FIX 3: Added spacing and robust translation */}
                <button
                    onClick={() => onFilterChange("requests")}
                    className={`flex items-center gap-2 p-3 text-sm font-semibold rounded-lg transition ${
                        currentFilter === "requests"
                            ? "bg-dark-3 text-primary-500 border border-primary-500"
                            : "bg-dark-4 text-light-2 hover:bg-dark-3"
                    }`}
                >
                    <img src="/assets/icons/save.svg" alt="Requests" className="w-4 h-4 invert" />
                    {getT("myGroups.membershipRequests", "Membership Requests")}
                </button>
            </div>
            
            {/* Displaying Placeholder Content based on filter */}
            <div className="mt-8 flex-center flex-col min-h-[300px]">
                {currentFilter === "joined" || currentFilter === null ? (
                    <p className="text-light-4 body-medium">
                        {getT("myGroups.noGroupsJoined", "You haven't joined any groups yet.")}
                    </p>
                ) : currentFilter === "created" ? (
                    <p className="text-light-4 body-medium">
                        {getT("myGroups.noGroupsCreated", "You haven't created any groups yet.")}
                    </p>
                ) : (
                    <p className="text-light-4 body-medium">
                        {getT("myGroups.noPendingRequests", "No pending membership requests.")}
                    </p>
                )}
            </div>
        </div>
    );
};

// --- END: Mocked MyGroups Component ---


// --- START: PromoCodePopup component (Kept for continuity) ---

interface PromoCodePopupProps {
    isOpen: boolean;
    onClose: () => void;
    onCodeApply: (code: string) => void;
    t: (key: string, options?: { [key: string]: any, defaultValue?: string }) => string;
}

const PromoCodePopup = ({ isOpen, onClose, onCodeApply, t }: PromoCodePopupProps) => {
    const [inputCode, setInputCode] = useState("");

    if (!isOpen) return null;

    // Helper function to get translated text with a strong English fallback
    const getT = (key: string, fallback: string) => t(key, { defaultValue: fallback });

    const handleApply = () => {
        if (inputCode.trim()) {
            onCodeApply(inputCode.trim());
            setInputCode(""); // Clear after attempt
            toast.success(getT("profile.promoCodeAttempt", "Attempting to apply code..."));
        } else {
            toast.error(getT("profile.enterPromoCode", "Please enter a promo code."));
        }
    };
    
    // Simple Modal/Popup UI Structure
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-dark-2 rounded-xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="h3-bold mb-4 flex items-center gap-3">
                    <FaTag className="text-green-500" />
                    {getT("profile.promoCode", "Promo Code")}
                </h2>
                <p className="text-light-3 mb-6">
                    {getT("profile.applyPromoDescription", "Enter your promotional code to receive a reward.")}
                </p>

                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder={getT("profile.enterCodePlaceholder", "Enter your code")}
                        className="flex-1 bg-dark-3 border border-dark-4 rounded-lg p-3 text-light-1 focus:border-primary-500"
                    />
                    <Button
                        type="button"
                        onClick={handleApply}
                        disabled={!inputCode.trim()}
                        className="bg-green-600 hover:bg-green-700 text-sm h-10 px-6 font-semibold"
                    >
                        {getT("common.apply", "Apply")}
                    </Button>
                </div>

                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="shad-button_secondary"
                    >
                        {getT("common.close", "Close")}
                    </Button>
                </div>
            </div>
        </div>
    );
};
// --- END: PromoCodePopup component ---


const cardCategories = [
  "Profile Upgrades",
  "Post Highlights",
  "Post Enhancements",
  "Ad-Free Browsing",
  "Pinned Content",
  "Gifts & Recognition",
];

const StatBlock = ({
  value,
  label,
  userId,
  isOtherUser,
}: {
  value: number;
  label: string;
  userId: string;
  isOtherUser: boolean;
}) => {
  const navigateTo =
    label === "Posts" ? `/profile/${userId}` : `/profile/${userId}/groups`;

  return (
    <div className="flex-center gap-2">
      {isOtherUser ? (
        <Link
          to={navigateTo}
          className="small-semibold lg:body-bold text-primary-500 hover:underline"
          aria-label={`View ${label} for user ${userId}`}>
          {value}
        </Link>
      ) : (
        <p className="small-semibold lg:body-bold text-primary-500">{value}</p>
      )}
      {isOtherUser ? (
        <Link
          to={navigateTo}
          className="small-medium lg:base-medium text-light-2 hover:underline"
          aria-label={`${label} count`}>
          {label}
        </Link>
      ) : (
        <p className="small-medium lg:base-medium text-light-2">{label}</p>
      )}
    </div>
  );
};

const Profile = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useUserContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isUserBlocked, isLoading: isBlockedLoading } = useIsBlocked(
    user.id,
    id || ""
  );
  const { mutate: block, isLoading: isBlocking } = useBlockUser();

  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
  } = useGetUserById(id || "") as {
    data: UserDetails | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: userPosts } = useGetUserPosts(id || "", 10, user.id);
  const { data: userPolls } = useGetUserPolls(id || "", 10, user.id);
  const { data: userGroups } = useGetUserGroups(id || "");
  const { mutateAsync: decreaseBalance } = useDecreaseWalletBalance();

  const [isQpLvlActive, setIsQpLvlActive] = useState(false);
  const [isQWalletActive, setIsQWalletActive] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [basket, setBasket] = useState<Card[]>([]); 
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any>([]);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  
  const [isPromoCodePopupOpen, setIsPromoCodePopupOpen] = useState(false); 
  
  const topUpAmounts = [5, 10, 30, 50];
  const { data: userDrafts } = useGetUserDrafts(id || "");

  const [currentFilter, setCurrentFilter] = useState<
    "posts" | "polls" | "drafts" | null
  >(null);
  const [savedFilter, setSavedFilter] = useState<
    "posts" | "polls" | "group" | null
  >(null);
  const [groupsFilter, setGroupsFilter] = useState<
    "joined" | "created" | "requests" | null
  >(null);
  const [likedPostsFilter, setLikedPostsFilter] = useState<
    "posts" | "polls" | null
  >(null);

  const publicPostsLength =
    userPosts?.filter((post) => !post.groupIdString).length || 0;
  const publicPollsLength =
    userPolls?.filter((poll) => !poll.groupIdString).length || 0;

  const handleLikedPostsClick = useCallback(() => setLikedPostsFilter(null), []);
  const handleGroupsClick = useCallback(() => setGroupsFilter(null), []);
  const handleSavedClick = useCallback(() => setSavedFilter(null), []);
  const handlePostsClick = useCallback(() => setCurrentFilter(null), []);

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      navigate("/settings/update-profile");
    },
    [navigate]
  );

  useEffect(() => {
    if (currentUser?.walletBalance != null) {
      setWalletBalance(currentUser.walletBalance);
    } else {
      setWalletBalance(0);
    }
  }, [currentUser]);

  const handleTopUpClick = useCallback(
    (amount: number) => {
      if (!user.id) {
        toast.error(t("profile.walletTopUpSuccess", { defaultValue: "Wallet top-up successful!" }));
        navigate("/sign-in");
        return;
      }
      setSelectedAmount(amount);
    },
    [user.id, navigate, t]
  );

  const handlePaymentSuccess = useCallback(
    (amount: number) => {
      setWalletBalance((prev) => prev + amount);
      setTransactionHistory((prev: any) => [
        ...prev,
        {
          date: new Date().toISOString(),
          type: "Top-up",
          amount,
          status: "Completed",
        },
      ]);
      createTransaction({
        user_id: user.id,
        created_at: new Date().toISOString(),
        type: "Top-up",
        amount,
        details: "Wallet Top-up",
        status: "Completed",
      }).catch((e) => {
        console.error(e);
        toast.error(t("profile.recordTopupFailed", { defaultValue: "Failed to record top-up" }));
      });
      setSelectedAmount(null);
    },
    [user.id, t]
  );
  
  const handleApplyPromoCode = useCallback((code: string) => {
    const getT = (key: string, fallback: string) => t(key, { defaultValue: fallback });
    if (code.toLowerCase() === "20off") {
        toast.success(getT("profile.promoCodeApplied", `Promo code ${code} applied successfully! You received 5 currency units.`));
        setWalletBalance((prev) => prev + 5); 
    } else if (code.toLowerCase() === "freecard") {
        toast.success(getT("profile.promoCodeApplied", `Promo code ${code} applied successfully! You received a free item.`));
    } else {
        toast.error(getT("profile.invalidPromoCode", `Invalid promo code: ${code}. Please try again.`));
    }
  }, [t]);


  const calculateAge = useCallback((dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, []);

  const handleCategoryClick = useCallback(
    (catId: string, sub?: string) => {
      navigate("/", { state: { categoryId: catId, subCategory: sub } });
    },
    [navigate]
  );

  const handleQpLvlToggle = useCallback(() => {
    if (isQpLvlActive) {
      setIsQpLvlActive(false);
      navigate(`/profile/${id}/`);
    } else {
      setIsQpLvlActive(true);
      setIsQWalletActive(false);
      navigate(`/profile/${id}/my-level`);
    }
  }, [isQpLvlActive, id, navigate]);

  const handleQWalletToggle = useCallback(() => {
    if (isQWalletActive) {
      setIsQWalletActive(false);
      navigate(`/profile/${id}`);
    } else {
      setIsQWalletActive(true);
      setIsQpLvlActive(false);
      navigate(`/profile/${id}/AllCards`);
    }
  }, [id, navigate, isQWalletActive]);

  const handleBackToProfile = useCallback(() => {
    setIsQWalletActive(false);
    setIsQpLvlActive(false);
    setSelectedAmount(null);
    setIsPromoCodePopupOpen(false); 
    navigate(`/profile/${id}`);
  }, [id, navigate]);

  useEffect(() => {
    if (pathname.endsWith(`/profile/${id}`)) {
      setIsQWalletActive(false);
      setIsQpLvlActive(false);
      setSelectedAmount(null);
      setIsPromoCodePopupOpen(false); 
    } else if (pathname.endsWith("/my-level")) {
      setIsQpLvlActive(true);
      setIsQWalletActive(false);
      setIsPromoCodePopupOpen(false); 
    } else if (pathname.includes("/AllCards")) {
      setIsQWalletActive(true);
      setIsQpLvlActive(false);
      setIsPromoCodePopupOpen(false); 
    }
  }, [pathname, id]);

  if (isUserLoading || !id || !user.id) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }
  if (userError || !currentUser) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-red-500">{t("profile.failedToLoad", { defaultValue: "Failed to load user data."})}</p>
      </div>
    );
  }

  const membershipYears = Math.floor(
    (Date.now() - new Date(currentUser.$createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 365)
  );
  const earnedBadges = badges
    .filter((b) => {
      switch (b.criteria.type) {
        case "membership_duration":
          return membershipYears >= b.criteria.threshold;
        case "great_comments":
          return (currentUser.greatCommentNumber || 0) >= b.criteria.threshold;
        case "great_questions":
          return (currentUser.greatQuestionsNumber || 0) >= b.criteria.threshold;
        case "opinions_replies_week":
          return (currentUser.repliesNumber || 0) >= b.criteria.threshold;
        case "likes_given_week":
          return (currentUser.likeNumber || 0) >= b.criteria.threshold;
        case "questions_asked":
          return (currentUser.NumberQuestionsAsked || 0) >= b.criteria.threshold;
        case "polls_participated":
          return (currentUser.numberPoll || 0) >= b.criteria.threshold;
        case "likes_received":
          return (currentUser.totalLikes || 0) >= b.criteria.threshold;
        case "login_days":
          return (currentUser.LoggedInCount || 0) >= b.criteria.threshold;
        default:
          return false;
      }
    })
    .map((b) => b.emoji);

  const isAdFreeActive = false;
  const selectedCategoryId = null;

  const showSidePosters =
    pathname === `/profile/${id}` && !isAdFreeActive && selectedCategoryId === null;

  return (
    <div className="profile-container relative px-4 lg:px-0">
      {showSidePosters && (
        <div
          onClick={() => {
            if (currentUser) navigate(`/profile/${currentUser.$id}/qp-shop`);
            else navigate("/login");
          }}
          className="hidden lg:block absolute left-4 top-[20%] -translate-y-1/2 w-60 h-72 bg-[var(--background-2)] rounded-3xl border border-[var(--background-4)] p-4 cursor-pointer z-10"
          role="button"
          aria-label="Go to QP Shop"
          style={{ pointerEvents: "auto" }}>
          <h2 className="text-2xl font-extrabold mb-2 tracking-wide">
            You have <span className="text-yellow-300">50 QP</span>!
          </h2>
          <p className="text-base opacity-90">Check out which extras you could activate!</p>
          <div className="mt-4 text-sm font-semibold bg-white/20 py-2 px-3 rounded-xl w-fit">
            Go to QP Shop
          </div>
        </div>
      )}

      {showSidePosters && (
        <div
          onClick={() => {
            if (currentUser) navigate(`/profile/${currentUser.$id}/AllCards`);
            else navigate("/login");
          }}
          className="hidden lg:block absolute right-4 top-[20%] -translate-y-1/2 w-60 h-72 bg-[var(--background-2)] rounded-3xl border border-[var(--background-4)] p-4 cursor-pointer z-10"
          role="button"
          aria-label="See Available Upgrades"
          style={{ pointerEvents: "auto" }}>
          <h2 className="text-2xl font-extrabold mb-2 tracking-wide">Upgrade your profile!</h2>
          <p className="text-base opacity-90">Unlock more perks and exclusive features.</p>
          <div className="mt-4 text-sm font-semibold bg-white/20 py-2 px-3 rounded-xl w-fit">
            See Available Upgrades
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-5xl mx-auto">
        <div className="profile-inner_container">
          <div className="flex xl:flex-row flex-col max-xl:items-center flex-1 gap-7">
            {/* Avatar */}
            <div className="relative">
              <Link
                to={`/profile/${id}`}
                onClick={handleBackToProfile}
                className="relative inline-block">
                <ColoredAvatar user={currentUser} />
                {user.id === currentUser.$id && (
                  <Link
                    to="/settings/update-profile"
                    onClick={handleSettingsClick}
                    className="absolute bottom-0 left-0 bg-dark-4 p-0.5 rounded-full w-8 h-8 flex-center"
                    aria-label="Settings">
                    <img
                      src="/assets/icons/settings.svg"
                      alt="settings"
                      width={14}
                      height={14}
                      className="opacity-90 hover:opacity-100"
                    />
                  </Link>
                )}
              </Link>
            </div>

            {/* User Info */}
            <div className="flex flex-col flex-1 justify-between md:mt-2">
              <div className="flex flex-col w-full">
                <Link to={`/profile/${id}`} onClick={handleBackToProfile}>
                  <h2 className="text-center xl:text-left h3-bold md:h1-bold w-full hover:underline">
                    {currentUser.name}
                  </h2>
                </Link>
                <p className="small-regular md:body-medium text-light-3 text-center xl:text-left">
                  {currentUser.dateOfBirth ? (
                    <>
                      {calculateAge(currentUser.dateOfBirth)}{" "}
                      {t("profile.yearsOld", { defaultValue: "years old" })}
                    </>
                  ) : (
                    t("profile.ageNotAvailable", { defaultValue: "Age not available" })
                  )}
                  {" · "}
                  {currentUser.gender
                    ? currentUser.gender === "M"
                      ? t("profile.male", { defaultValue: "Male" })
                      : t("profile.female", { defaultValue: "Female" })
                    : t("profile.genderNotSpecified", { defaultValue: "Gender not specified" })}
                </p>
                {currentUser.$id !== user.id && currentUser.level != null && (
                  <p className="body-bold text-primary-500 text-center xl:text-left">
                    {t("profile.level", { defaultValue: "Level" })}: {currentUser.level}
                  </p>
                )}
                <p className="small-regular text-light-3 text-center xl:text-left">
                  {t("profile.qlife", { defaultValue: "Q-Life" })}:{" "}
                  {formatTimeDifference(currentUser.$createdAt || "", {
                    excludeAgo: true,
                  })}
                  {" · "}
                  {t("profile.qvisit", { defaultValue: "Q-Visit" })}:{" "}
                  {formatTimeDifference(currentUser.lastActive || "", {
                    excludeAgo: false,
                  })}
                </p>
                {earnedBadges.join(" ")}
              </div>

              <div className="flex gap-8 mt-10 items-center justify-center xl:justify-start flex-wrap z-20">
                <StatBlock
                  value={publicPostsLength + publicPollsLength}
                  label={t("profile.posts", { defaultValue: "Posts" })}
                  userId={id}
                  isOtherUser={user.id !== currentUser.$id}
                />
                <StatBlock
                  value={userGroups?.length || 0}
                  label={t("profile.groups", { defaultValue: "Groups" })}
                  userId={id}
                  isOtherUser={user.id !== currentUser.$id}
                />
              </div>

              <p className="small-medium md:base-medium text-center xl:text-left mt-7 max-w-screen-sm">
                {currentUser.bio || t("profile.noBioAvailable", { defaultValue: "No bio available." })}
              </p>
            </div>


{/* ▼ MODIFIED: Wallet/Top-up section (With Fallbacks) ▼ */}
<div className={`${user.id !== currentUser.$id && "hidden"} flex flex-col items-center gap-4 w-full max-w-xs`}>
  {/* LVL/QP + QWallet */}
  <div className="flex gap-3 justify-center w-full">
    <button
      onClick={handleQpLvlToggle}
      className={`h-12 bg-dark-4 px-5 text-light-1 flex-center gap-2 rounded-lg min-w-[150px] ${
        isQpLvlActive ? "!bg-dark-3 border-2 border-indigo-600" : ""
      }`}
    >
      <img src="/assets/icons/Qpointicon.svg" width={20} height={20} alt="QP" />
      <p className="whitespace-nowrap small-medium">
        {t("profile.lvlQp", { defaultValue: "LVL/QP" })}
      </p>
    </button>

    <button
      onClick={handleQWalletToggle}
      className={`h-12 bg-dark-4 px-5 text-light-1 flex-center gap-2 rounded-lg min-w-[150px] ${
        isQWalletActive ? "!bg-dark-3 border-2 border-indigo-600" : ""
      }`}
    >
      <img src="/assets/icons/waller.svg" width={25} height={20} alt="Wallet" />
      <p className="whitespace-nowrap small-medium">
        {t("profile.qWallet", { defaultValue: "QWallet" })}
      </p>
    </button>
  </div>

  {/* Top-up buttons centered under QWallet */}
  <div className="grid grid-cols-2 gap-3 w-full">
    {topUpAmounts.map((amt) => (
      <Button
        key={amt}
        onClick={() => handleTopUpClick(amt)}
        className="bg-primary-500 hover:bg-primary-600 text-sm h-10 w-full"
      >
        {t("profile.addToWallet", { amount: amt, defaultValue: `+€${amt} Top-up` })}
      </Button>
    ))}
  </div>

  {/* Balance */}
  <div className="border-2 border-indigo-600 rounded-lg p-2 text-center w-full">
    <div className="flex items-center justify-center gap-2 mb-1">
        <FaWallet className="w-5 h-5 text-indigo-400" />
        <p className="small-medium text-light-3 uppercase tracking-wider">
            {t("common.balance", { defaultValue: "BALANCE" })}
        </p>
    </div>
    <p className="text-2xl font-bold text-light-1">€{(walletBalance || 0).toFixed(2)}</p>
  </div>

  {/* Promo Code Button - REPLACED BASKET */}
  <button
    className="border-2 border-green-500 rounded-lg p-3 text-center w-full transition duration-300 hover:bg-dark-4"
    onClick={() => setIsPromoCodePopupOpen(true)}
  >
    <h3 className="flex items-center justify-center gap-2">
      <FaTag className="text-green-500 w-5 h-5" /> 
      <span className="text-light-2 font-bold">
        {t("profile.promoCode", { defaultValue: "Promo Code" })}
      </span> 
    </h3>
  </button>
</div>
{/* ▲ END MODIFIED WALLET SECTION ▲ */}




            {/* OTHER USER: Message + Block */}
            <div className={`${user.id === currentUser.$id && "hidden"} flex gap-4`}>
              <Button
                type="button"
                className="shad-button_primary px-4 flex items-center gap-2"
                onClick={() =>
                  navigate("/MessagesPage", {
                    state: { selectedUserId: currentUser.$id },
                  })
                }>
                <img src="/assets/icons/message2.svg" alt="msg" width={20} height={20} />
                {t("profile.message", { defaultValue: "Message" })}
              </Button>

              {isBlockedLoading ? (
                <Loader />
              ) : isUserBlocked ? (
                <Button
                  type="button"
                  className="shad-button_primary px-3 text-sm bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  disabled={isBlocking}
                  onClick={() =>
                    block(
                      { blockerId: user.id, blockedId: currentUser.$id, unblock: true },
                      { onSuccess: () => toast.success(t("profile.userUnblockedSuccess", { defaultValue: "User unblocked successfully!" })) }
                    )
                  }>
                  <img src="/assets/icons/Unblock.svg" alt="unblock" width={20} height={20} />
                  {t("profile.unblock", { defaultValue: "Unblock" })}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="shad-button_primary px-3 text-sm bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  disabled={isBlocking}
                  onClick={() =>
                    block(
                      { blockerId: user.id, blockedId: currentUser.$id },
                      { onSuccess: () => toast.success(t("profile.userBlockedSuccess", { defaultValue: "User blocked successfully!" })) }
                    )
                  }>
                  <img src="/assets/icons/blocked2.svg" alt="block" width={20} height={20} />
                  {t("profile.block", { defaultValue: "Block" })}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Popups */}
        {selectedAmount && (
          <PaymentPopup
            amount={selectedAmount}
            onSuccess={handlePaymentSuccess}
            onClose={() => setSelectedAmount(null)}
            userId={user.id}
          />
        )}
        
        {/* ADDED: Promo Code Popup Rendering */}
        <PromoCodePopup
            isOpen={isPromoCodePopupOpen}
            onClose={() => setIsPromoCodePopupOpen(false)}
            onCodeApply={handleApplyPromoCode}
            t={t}
        />

        {/* Tabs */}
        {currentUser.$id === user.id && (
          <div className={`flex max-w-5xl w-full z-10 ${pathname === `/profile/${id}/groups` ? "-mb-10" : ""}`}>
            {isQWalletActive ? (
              <div className="flex ml-[150px] flex-wrap gap-1 px-2">
                <Link to={`/profile/${id}/AllCards`} className={`profile-tab ${pathname === `/profile/${id}/AllCards` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/allcard.svg" alt="all" width={20} height={20} />
                  {t("profile.allCards", { defaultValue: "All Cards" })}
                </Link>
                <Link to={`/profile/${id}/MyCards`} className={`profile-tab ${pathname === `/profile/${id}/MyCards` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/my-cards.svg" alt="my" width={20} height={20} />
                  {t("profile.myCards", { defaultValue: "My Cards" })}
                </Link>
                <Link to={`/profile/${id}/History`} className={`profile-tab ${pathname === `/profile/${id}/History` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/history.svg" alt="hist" width={20} height={20} />
                  {t("profile.history", { defaultValue: "History" })}
                </Link>
              </div>
            ) : isQpLvlActive ? (
              <div className="flex ml-[150px] flex-wrap gap-1 px-2">
                <Link to={`/profile/${id}/my-level`} className={`profile-tab rounded-l-lg ${pathname === `/profile/${id}/my-level` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/my-level.svg" alt="lvl" width={20} height={20} />
                  {t("profile.myLevel", { defaultValue: "My Level" })}
                </Link>
                <Link to={`/profile/${id}/my-qp`} className={`profile-tab ${pathname === `/profile/${id}/my-qp` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/Qpointicon.svg" alt="qp" width={20} height={20} />
                  {t("profile.myQP", { defaultValue: "My QP" })}
                </Link>
                <Link to={`/profile/${id}/qp-shop`} className={`profile-tab rounded-r-lg ${pathname === `/profile/${id}/qp-shop` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/shop.svg" alt="shop" width={20} height={20} />
                  {t("profile.qpShop", { defaultValue: "QP Shop" })}
                </Link>
              </div>
            ) : (
              <>
                <Link to={`/profile/${id}`} className={`profile-tab rounded-l-lg ${pathname === `/profile/${id}` && "!bg-dark-3"}`} onClick={handlePostsClick}>
                  <img src="/assets/icons/posts.svg" alt="posts" width={20} height={20} />
                  {t("profile.posts", { defaultValue: "Posts" })}
                </Link>
                <Link to={`/profile/${id}/saved`} className={`profile-tab ${pathname === `/profile/${id}/saved` && "!bg-dark-3"}`} onClick={handleSavedClick}>
                  <img src="/assets/icons/save.svg" alt="saved" width={20} height={20} />
                  {t("profile.saved", { defaultValue: "Saved" })}
                </Link>
                <Link to={`/profile/${id}/groups`} className={`profile-tab ${pathname === `/profile/${id}/groups` && "!bg-dark-3"}`} onClick={handleGroupsClick}>
                  <img src="/assets/icons/groups.svg" alt="groups" width={20} height={20} />
                  {t("profile.myGroups", { defaultValue: "My Groups" })}
                </Link>
                <Link to={`/profile/${id}/liked-posts`} className={`profile-tab ${pathname === `/profile/${id}/liked-posts` && "!bg-dark-3"}`} onClick={handleLikedPostsClick}>
                  <img src="/assets/icons/like.svg" alt="liked" width={20} height={20} />
                  {t("profile.likedPosts", { defaultValue: "Liked Posts" })}
                </Link>
                <Link to={`/profile/${id}/blocked`} className={`profile-tab rounded-r-lg ${pathname === `/profile/${id}/blocked` && "!bg-dark-3"}`}>
                  <img src="/assets/icons/blocked.svg" alt="blocked" width={20} height={20} />
                  {t("profile.blocked", { defaultValue: "Blocked" })}
                </Link>
              </>
            )}
          </div>
        )}

        <Routes>
          <Route
            index
            element={
              <UserPosts
                userPosts={userPosts}
                userPolls={userPolls}
                userDrafts={userDrafts}
                isCurrentUser={currentUser.$id === user.id}
                currentFilter={currentFilter}
                onFilterChange={setCurrentFilter}
                onCategoryClick={handleCategoryClick}
              />
            }
          />
          {currentUser.$id === user.id && <Route path="my-level" element={<MyLevel />} />}
          {currentUser.$id === user.id && <Route path="my-qp" element={<MyQP />} />}
          {currentUser.$id === user.id && <Route path="qp-shop" element={<QPShop />} />}
          {currentUser.$id === user.id && (
            <Route
              path="saved"
              element={<Saved currentFilter={savedFilter} onFilterChange={setSavedFilter} />}
            />
          )}
          {/* Using the mocked/fixed MyGroups component */}
          {currentUser.$id === user.id && (
            <Route
              path="groups"
              element={
                <MyGroups 
                  currentFilter={groupsFilter} 
                  onFilterChange={setGroupsFilter}
                />
              }
            />
          )}
          {currentUser.$id === user.id && (
            <Route
              path="liked-posts"
              element={<LikedPosts currentFilter={likedPostsFilter} onFilterChange={setLikedPostsFilter} />}
            />
          )}
          {currentUser.$id === user.id && <Route path="blocked" element={<BlockedUsersList />} />}
          {currentUser.$id === user.id && (
            <Route
              path="AllCards"
              element={
                <AllCards
                  userId={id}
                  walletBalance={walletBalance}
                  cardsData={cardsData}
                  cardCategories={cardCategories}
                  Button={Button}
                  basket={basket}
                  setBasket={setBasket}
                />
              }
            />
          )}
          {currentUser.$id === user.id && (
            <Route
              path="MyCards"
              element={
                <MyCards
                  userId={id}
                  onBackToProfile={handleBackToProfile}
                  walletBalance={walletBalance}
                  setWalletBalance={setWalletBalance}
                  cardsData={cardsData}
                  cardCategories={cardCategories}
                  Button={Button}
                  basket={basket}
                  setBasket={setBasket}
                  myCards={myCards}
                  setMyCards={setMyCards}
                  transactionHistory={transactionHistory}
                  setTransactionHistory={setTransactionHistory}
                />
              }
            />
          )}
          {currentUser.$id === user.id && (
            <Route path="History" element={<History userId={id} transactionHistory={transactionHistory} />} />
          )}
          <Route path="groups" element={<UserGroups userGroups={userGroups} userId={id || ""} />} />
        </Routes>

        <Outlet />
      </div>
    </div>
  );
};

export default Profile;