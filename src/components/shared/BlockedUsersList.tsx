import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import { unblockUser } from "@/services/blockService";
import { getUserDocumentsByIds } from "@/services/userService";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { useTranslation } from "react-i18next";

interface BlockedUser {
  $id: string;
  name: string;
  imageUrl: string;
  blockedAt: string;
}

const BlockedUsersList = () => {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "blockedAt">("blockedAt");
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    const fetchBlocked = async () => {
      setLoading(true);
      try {
        const blockedEntries = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.blockedUsersCollectionId,
          [Query.equal("blockerId", user.id)]
        );


        const blockedDocs = await getUserDocumentsByIds(
          blockedEntries.documents.map((b) => b.blockedId)
        );

        const merged: BlockedUser[] = blockedDocs.map((doc: any) => {
          const match = blockedEntries.documents.find((b: any) => b.blockedId === doc.$id);
          return {
            $id: doc.$id,
            name: doc.name,
            imageUrl: doc.imageUrl,
            blockedAt: match?.$createdAt || "",
          };
        });

        setBlockedUsers(merged);
      } catch (error) {
        console.error("Failed to fetch blocked users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocked();
  }, [user.id]);

  const handleUnblock = async (blockedId: string) => {
    try {
      await unblockUser(user.id, blockedId);
      setBlockedUsers((prev) => prev.filter((u) => u.$id !== blockedId));
    } catch (error) {
      console.error("Failed to unblock user:", error);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = blockedUsers.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return (
          new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime()
        );
      }
    });

    return sorted;
  }, [searchQuery, sortBy, blockedUsers]);

  if (loading) {
    return <p className="text-light-3 mt-4">{t("blockedUsersList.loading")}</p>;
  }

  if (blockedUsers.length === 0) {
    return <p className="text-light-3 mt-4">{t("blockedUsersList.noBlockedUsers")}</p>;
  }

  return (
    <div className="w-full max-w-[1200px] min-h-[550px] bg-dark-2 p-6 rounded-xl shadow-xl border border-dark-4">
      <div className="flex justify-between items-center mb-4 px-4">
        <input
          type="text"
          placeholder={t("blockedUsersList.searchByName")}
          className="bg-dark-3 text-light-1 px-3 py-2 rounded-md border border-dark-4 outline-none w-1/3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <label className="text-light-3 text-sm">{t("blockedUsersList.sortBy")}</label>
          <select
            className="bg-dark-3 text-light-1 px-3 py-1 rounded-md border border-dark-4 outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "blockedAt")}
          >
            <option value="blockedAt">{t("blockedUsersList.date")}</option>
            <option value="name">{t("blockedUsersList.name")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-light-3 text-sm">{t("blockedUsersList.rows")}</label>
          <select
            className="bg-dark-3 text-light-1 px-3 py-1 rounded-md border border-dark-4 outline-none"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="border border-dark-4 rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-4 scrollbar-track-dark-2 scrollbar-thumb-rounded-full">
          <table className="w-full text-sm text-left text-light-3">
            <thead className="bg-dark-3 text-light-2 border-b border-dark-4">
              <tr>
                <th className="px-5 py-3">{t("blockedUsersList.user")}</th>
                <th className="px-5 py-3 text-center">{t("blockedUsersList.blockedDate")}</th>
                <th className="px-5 py-3 text-center">{t("blockedUsersList.action")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.slice(0, rowsPerPage).map((user) => (
                <tr
                  key={user.$id}
                  className="border-b border-dark-4 hover:bg-dark-4 transition-colors duration-200"
                >
                  <td className="px-5 py-3 border-r border-dark-4">
                    <Link 
                      to={`/profile/${user.$id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={user.imageUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-gray-600 cursor-pointer"
                      />
                      <span className="text-light-1 font-medium hover:underline cursor-pointer">
                        {user.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-center border-r border-dark-4">
                    {new Date(user.blockedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      className="px-4 py-1 bg-yellow-600 text-white font-medium rounded-2xl duration-200 shadow-sm "
                      onClick={() => handleUnblock(user.$id)}
                    >
                      {t("blockedUsersList.unblock")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersList;
