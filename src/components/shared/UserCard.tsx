import { Models } from 'appwrite';
import { Link } from 'react-router-dom';
import {
  useGetUserGroups,
  useGetUserPosts,
  useGetUserPolls,
  useGetUserCommentCount,
  useGetUserVotedPollsCount,
} from '@/lib/react-query/queries';
import ColoredAvatar from '@/components/shared/ColoredAvatar';
import { useTranslation } from 'react-i18next';

type UserCardProps = {
  user: Models.Document;
};

const UserCard = ({ user }: UserCardProps) => {
  const { t } = useTranslation();
  const { data: userGroups, isLoading: isGroupsLoading } = useGetUserGroups(user.$id);
  const { data: userPosts, isLoading: isPostsLoading } = useGetUserPosts(user.$id, 10, undefined);
  const { data: userPolls, isLoading: isPollsLoading } = useGetUserPolls(user.$id, 10, undefined);
  const { data: commentCount, isLoading: isCommentLoading } = useGetUserCommentCount(user.$id);
  const { data: votedCount, isLoading: isVotedLoading } = useGetUserVotedPollsCount(user.$id);

  const totalPosts = (userPosts?.length || 0) + (userPolls?.length || 0);
  const totalGroups = userGroups?.length || 0;

  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const age = calculateAge(user.dateOfBirth);
  const isLoading = isGroupsLoading || isPostsLoading || isPollsLoading || isCommentLoading || isVotedLoading;

  return (
    <Link to={`/profile/${user.$id}`} className="user-card">
      <div className="relative">
        <ColoredAvatar user={user} sizeClass="w-14 h-14" />
        {user.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-1"></span>
        )}
      </div>

      <div className="flex-center flex-col gap-1">
        <p className="base-medium text-light-1 text-center line-clamp-1">
          {user.name}
          {age !== null ? (
            <>
              {' . '}
              <span className="text-light-3">{t("userCard.age")}</span> {age}
            </>
          ) : (
            '.'
          )}
        </p>

        <div className="flex flex-col items-center gap-1">
          <p className="small-regular text-center line-clamp-1" style={{ color: '#877EFF' }}>
            {t("userCard.level")} {user.level}
          </p>
          <p className="small-regular text-center line-clamp-1" style={{ color: '#fa25cb' }}>
            {isLoading ? '...' : `${totalPosts} ${t("userCard.posts")} · ${totalGroups} ${t("userCard.groups")}`}
          </p>
          <p className="small-regular text-center line-clamp-1" style={{ color: '#D3B8F6' }}>
            {isLoading ? '...' : `${commentCount ?? 0} ${t("userCard.comments")} · ${votedCount ?? 0} ${t("userCard.pollVotes")}`}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default UserCard;