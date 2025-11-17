import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INavLink } from "@/types";
import { sidebarLinks } from "@/constants";

interface NavigationLinksProps {
  pathname: string;
}

const NavigationLinks = ({ pathname }: NavigationLinksProps) => {
  const { t } = useTranslation();

  // Create a mapping function to get translated labels
  const getTranslatedLabel = (label: string): string => {
    const labelMap: Record<string, string> = {
      "People": t('navigation.people'),
      "Questions": t('navigation.questions'),
      "Polls": t('navigation.polls'),
      "Groups": t('navigation.groups')
    };
    return labelMap[label] || label;
  };

  return (
    <ul className="flex flex-col gap-4 md:flex-row items-center justify-center md:gap-8">
      {sidebarLinks
        .filter((link) => link.label !== "Search" && link.label !== "Ask")
        .map((link: INavLink) => {
          let modifiedLabel = link.label;
          let modifiedRoute = link.route;
          let modifiedImgURL = link.imgURL;

          if (link.label === "Explore") {
            modifiedLabel = "Polls";
            modifiedRoute = "/polls";
            modifiedImgURL = "/assets/icons/polls.svg";
          }
          if (link.label === "Saved") {
            modifiedLabel = "Questions";
            modifiedRoute = "/explore";
            modifiedImgURL = "/assets/icons/questions.svg";
          }

          // Get translated label
          const translatedLabel = getTranslatedLabel(modifiedLabel);

          const isActive =
            modifiedLabel === "Groups"
              ? pathname.startsWith("/groups")
              : pathname === modifiedRoute;

          return (
            <li
              key={modifiedLabel}
              className={`leftsidebar-link group ${isActive && "bg-bleu-1"}`}>
              <NavLink
                to={modifiedRoute}
                className="flex items-center gap-4 p-4">
                <img
                  src={modifiedImgURL}
                  alt={translatedLabel}
                  className={`group-hover:invert-white ${
                    isActive && "invert-white"
                  }`}
                />
                {translatedLabel}
              </NavLink>
            </li>
          );
        })}
    </ul>
  );
};

export default NavigationLinks;
