import { Link } from "react-router-dom";
import XperPointsCircle from "@/components/level/XperPointsCircle";
import { useGetCurrentUser } from "@/lib/react-query/queries";
import { getMaxPointsForLevel, getLevelName } from "@/lib/levelUtils";
import { getPermissionsForLevel } from "@/lib/levelPermissions";
import { useTranslation } from "react-i18next";

const MyLevel = () => {
  const { t } = useTranslation();
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useGetCurrentUser();

  const level = user?.level;
  const levelName = getLevelName(level);
  const currentPoints = user?.point || 0;
  const maxPoints = getMaxPointsForLevel(level);
  const permissions = getPermissionsForLevel(level);

  if (userLoading) {
    return (
      <div className="min-w-full min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-primary-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-2 w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-pulse opacity-20"></div>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-w-full min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 flex items-center justify-center">
        <div className="bg-red/20 backdrop-blur-md border border-red/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-red text-2xl font-bold mb-3">⚠️ Error</div>
          <div className="text-light-2">Failed to load user data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-full min-h-screen bg-gradient-to-br relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Main gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-primary-600/15 to-primary-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>


        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {[...Array(144)].map((_, i) => (
              <div
                key={i}
                className="border border-primary-500/20 rounded animate-pulse"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '4s' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {/* Reduced overall top padding from pt-4 to pt-2 to shift content up further */}
      <div className="relative z-10 min-w-full px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        
        {/* Removed header content section, further reducing top space */}
        {/* We will rely on the pt-12 below for necessary spacing from the top of the screen */}
        <div className="text-center mb-0 pt-12"></div> 

        {/* Main content grid - added items-start for vertical alignment at the top */}
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-4 items-start"> 
          
          {/* Left side - Circle with enhanced animations */}
          {/* Used flex-col to stack text and circle, and removed mb-4 to bring content up */}
          <div className="flex flex-col justify-center items-center">
             
            {/* Informative Text */}
            <div className="text-center mb-4">
              <p className="text-light-3 text-md max-w-sm mx-auto">
                Unlock your potential • Track your progress • Reach new heights
              </p>
               {/* Kept the decorative div, but ensured it doesn't take up excessive space */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent animate-pulse blur-sm"></div>
            </div>

            {/* XperPointsCircle */}
            <div className="relative">
              <XperPointsCircle
                level={level}
                levelName={levelName}
                currentPoints={currentPoints}
                maxPoints={maxPoints}
              />

              {/* Extra decorative elements */}
              <div className="absolute -inset-4 rounded-full border border-primary-500/10 animate-spin" style={{ animationDuration: '15s' }}></div>
              <div className="absolute -inset-8 rounded-full border border-primary-600/5 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }}></div>
            </div>
          </div>

          {/* Right side - Enhanced info cards (This will naturally align to the top due to items-start on the grid) */}
          <div className="space-y-4">
            {/* Level info card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-dark-3 to-dark-4 backdrop-blur-xl border border-primary-500/30 rounded-2xl p-6 shadow-2xl group-hover:scale-[1.02] transition-all duration-500"> 
                <div className="flex items-center gap-4 mb-4"> 
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse flex-shrink-0"> 
                    <span className="text-xl">🎯</span> 
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-light-1 mb-1"> 
                      Level {level} - {levelName}
                    </h2>
                    <p className="text-light-3 text-sm">{t("myLevel.currentStatus")}</p> 
                  </div>
                </div>

                {/* Enhanced progress section */}
                <div className="mb-4"> 
                  <div className="flex justify-between items-center mb-2"> 
                    <span className="text-light-2 font-medium text-sm">{t("myLevel.progressToNext")}</span> 
                    <span className="text-primary-500 font-bold text-base"> 
                      {((currentPoints / maxPoints) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-dark-4 rounded-full overflow-hidden border border-primary-500/30"> 
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-2000 ease-out"
                      style={{ width: `${(currentPoints / maxPoints) * 100}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                  <div className="flex justify-between text-xs text-light-4 mt-1"> 
                    <span>{currentPoints.toLocaleString()} points</span>
                    <span>{t("myLevel.pointsNeeded", { points: (maxPoints - currentPoints).toLocaleString() })}</span>
                  </div>
                </div>

                {/* Enhanced permissions list */}
                <div className="space-y-2"> 
                  <h3 className="text-base font-semibold text-light-1 mb-2">{t("myLevel.unlockedAbilities")}</h3> 
                  {permissions.perks.map((perk, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-dark-4/50 to-dark-3/50 rounded-lg border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 group/item" 
                    >
                      <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300"> 
                        <span className="text-white text-xs font-bold">✓</span> 
                      </div>
                      <span className="text-light-2 font-medium text-sm">{perk}</span> 
                    </div>
                  ))}

                  {/* Posts per 24h with special highlight */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/40 relative overflow-hidden"> 
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/10 animate-pulse"></div>
                    <div className="relative w-6 h-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0"> 
                      <span className="text-white text-xs">📝</span> 
                    </div>
                    <span className="relative text-light-1 font-semibold text-sm"> 
                      {t("myLevel.postsPerDay", { count: permissions.postsPer24h })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info link with animation */}
            <div className="text-center">
              <Link
                to="/qp-lvl-explanation"
                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 transition-all duration-300 text-sm font-semibold group bg-gradient-to-r from-primary-500/10 to-primary-600/10 px-4 py-2 rounded-lg border border-primary-500/30 hover:border-primary-500/50 hover:scale-105" 
              >
                <span>{t("myLevel.whatIsQP")}</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300 text-base">→</span> 
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MyLevel;