import React, { createContext, useContext, useState } from "react";

type SearchContextType = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchContext: "posts" | "groups" | "groupPosts" | "polls" | "user" | "myGroups";
  setSearchContext: (
    context: "posts" | "groups" | "groupPosts" | "polls" | "user" | "myGroups"
  ) => void;
  isLoadingSearch: boolean;
  setLoadingSearch: (loading: boolean) => void;
  currentGroupId: string | null; // Add this line
  setCurrentGroupId: (groupId: string | null) => void; // Add this line
};


const SearchContext = createContext<SearchContextType>({
  searchValue: "",
  setSearchValue: () => {},
  searchContext: "posts",
  setSearchContext: () => {},
  isLoadingSearch: false,
  setLoadingSearch: () => {},
  currentGroupId: null, // Add this line
  setCurrentGroupId: () => {}, // Add this line
});

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchContext, setSearchContext] = useState<
    "posts" | "groups" | "groupPosts" | "polls" | "user" | "myGroups"
  >("posts");
  const [isLoadingSearch, setLoadingSearch] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null); // Add this line

  return (
    <SearchContext.Provider
      value={{
        searchValue,
        setSearchValue,
        searchContext,
        setSearchContext,
        isLoadingSearch,
        setLoadingSearch,
        currentGroupId, // Add this line
        setCurrentGroupId, // Add this line
      }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => useContext(SearchContext);