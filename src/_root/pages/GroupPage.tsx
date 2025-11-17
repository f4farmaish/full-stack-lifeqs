import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "@/components/shared";
import { useSearchContext } from "@/context/SearchContext";
import IsNotMemberGroupPage from "@/components/groups/IsNotMemberGroupPage";
import {
  useFetchGroupContent,
  useFetchGroup,
  useGetCurrentUser,
} from "@/lib/react-query/queries";
import IsMemberGroupPage from "@/components/groups/IsMemberGroupPage";
import useDebounce from "@/hooks/useDebounce";
import { IGroup } from "@/types";

// Define interface for type safety
interface User {
  $id: string;
  name: string;
  imageUrl?: string;
}

const GroupPage = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState<IGroup | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const { searchValue, setSearchContext } = useSearchContext();
  const debouncedSearch = useDebounce(searchValue, 400);

  const { data: groupContent = [], isLoading: isContentLoading } =
    useFetchGroupContent({
      groupId: groupId!,
      search: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
    });

  const {
    data: currentUserDoc,
    isLoading: userLoading,
    error: userError,
  } = useGetCurrentUser();
  const {
    data: groupData,
    isLoading: groupLoading,
    error: groupError,
  } = useFetchGroup(groupId!);

  useEffect(() => {
    if (currentUserDoc && groupData) {
      const user: User = {
        $id: currentUserDoc.$id,
        name: currentUserDoc.name || "Unknown User",
        imageUrl: currentUserDoc.imageUrl,
      };

      const formattedGroupData = groupData as any;
      const formattedGroup: IGroup = {
        $id: formattedGroupData.$id,
        creatorId: formattedGroupData.creatorId || "",
        admins: Array.isArray(formattedGroupData.admins)
          ? formattedGroupData.admins.map(String)
          : [],
        memberIds: Array.isArray(formattedGroupData.memberIds)
          ? formattedGroupData.memberIds.map(String)
          : [],
        memberNames: Array.isArray(formattedGroupData.memberNames)
          ? formattedGroupData.memberNames
          : [],
        memberImages: Array.isArray(formattedGroupData.memberImages)
          ? formattedGroupData.memberImages
          : [],
        name: formattedGroupData.name || "Untitled Group",
        description: formattedGroupData.description || "",
        imageUrl: formattedGroupData.imageUrl,
        categoryId:
          typeof formattedGroupData.categoryId === "object" &&
          formattedGroupData.categoryId
            ? formattedGroupData.categoryId.$id
            : formattedGroupData.categoryId || "",
        subCategory: formattedGroupData.subCategory || "",
        categoryName: formattedGroupData.categoryName,
        tags: formattedGroupData.tags || [],
        createdAt: formattedGroupData.$createdAt || new Date().toISOString(),
        memberCount:
          formattedGroupData.memberCount ||
          formattedGroupData.memberIds?.length ||
          0,
        lastActivityTimestamp: formattedGroupData.lastActivityTimestamp,
      };

      const userIsAdmin = formattedGroup.admins.includes(user.$id);
      const userIsMember = formattedGroup.memberIds.includes(user.$id);

      if (!userIsAdmin && !userIsMember) {
        setIsAuthorized(false);
        setGroup(formattedGroup);
        return;
      }

      setSearchContext("groupPosts");
      setGroup(formattedGroup);
      setIsAuthorized(true);
    }
  }, [currentUserDoc, groupData, groupId, setSearchContext]);

  if (userLoading || groupLoading || isContentLoading) return <Loader />;

  const fetchError = userError || groupError;
  if (fetchError) {
    const errorMessage =
      fetchError instanceof Error
        ? fetchError.message
        : String(fetchError || "Failed to load group details.");
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <h1 className="text-2xl font-semibold text-red-500">{errorMessage}</h1>
      </div>
    );
  }

  if (!group) return <Loader />;

  return isAuthorized ? (
    <IsMemberGroupPage group={group} posts={groupContent} />
  ) : (
    <IsNotMemberGroupPage group={group} />
  );
};

export default GroupPage;
