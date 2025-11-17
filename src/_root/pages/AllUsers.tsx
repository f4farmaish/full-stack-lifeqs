import { useToast } from '@/components/ui/use-toast';
import { Loader, UserCard } from '@/components/shared';
import { useGetUsers, useGetUsersByPointHistory } from '@/lib/react-query/queries';
import { useLocation } from 'react-router-dom';
import { Query, Models } from 'appwrite';
import { useSearchContext } from '@/context/SearchContext';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface User extends Models.Document {
  $id: string;
  name: string;
  imageUrl?: string;
  point: number;
  isOnline: boolean;
  level: number;
  gender?: string;
  dateOfBirth?: string;
}

const AllUsers = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { searchValue } = useSearchContext();
  const searchQuery = searchValue.trim();
  const [filter, setFilter] = useState('all-time');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const { ref, inView } = useInView({ threshold: 0 });

  const getFilters = useCallback(() => {
    const filters = [];
    if (searchQuery) {
      filters.push(Query.search('name', searchQuery));
    }
    if (showOnlineOnly) {
      filters.push(Query.equal('isOnline', true));
    }
    filters.push(Query.orderDesc('point'));
    return filters;
  }, [searchQuery, showOnlineOnly]);

  const dateRange = useMemo(() => {
    if (filter === 'all-time') return undefined;
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date = new Date();

    if (filter === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'yesterday') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    }

    return {
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate.toISOString(),
    };
  }, [filter]);

  const {
    data: pointHistoryData,
    isLoading: pointHistoryLoading,
    isError: isErrorPointHistory,
  } = useGetUsersByPointHistory(dateRange, getFilters());

  const {
    data: allUsersData,
    isLoading: allUsersLoading,
    isError: isErrorAllUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetUsers(6, getFilters());

  const creators = filter === 'all-time' ? allUsersData : pointHistoryData;
  const isLoading = filter === 'all-time' ? allUsersLoading : pointHistoryLoading;
  const isError = filter === 'all-time' ? isErrorAllUsers : isErrorPointHistory;

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    toast({ title: 'Something went wrong.' });
    return null;
  }

  return (
    <div className="common-container">
      <div className="user-container">
        <div className="flex-between w-full max-w-5xl mb-4">
          <h2 className="h3-bold md:h2-bold text-left">
            {searchQuery ? `Search results for "${searchQuery}"` : 'TOP users'}
          </h2>
          <div className="flex gap-3">
            <select
              className="bg-dark-3 rounded-xl px-4 py-2 text-light-2 cursor-pointer"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all-time">All Time</option>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="yesterday">Yesterday</option>
            </select>
            <button
              className="flex-center gap-3 bg-dark-3 rounded-xl px-4 py-2 cursor-pointer"
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
            >
              <p className="small-medium md:base-medium">
                {showOnlineOnly ? 'Online Members' : 'All Users'}
              </p>
              <img src="/assets/icons/filter.svg" width={20} height={20} alt="filter" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : !creators || creators.length === 0 ? (
          <p className="text-light-2">No users available</p>
        ) : (
          <ul className="user-grid">
            {creators.map((creator: User) => (
              <li key={creator?.$id} className="flex-1 min-w-[200px] w-full">
                <UserCard user={creator} />
              </li>
            ))}
            <li ref={ref} className="h-10" /> {/* Sentinel for infinite scroll */}
            {isFetchingNextPage && <Loader />}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AllUsers;