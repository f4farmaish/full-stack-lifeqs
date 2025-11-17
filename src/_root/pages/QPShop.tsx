import React, { useState, useEffect, useRef } from 'react';
import { useGetCurrentUser, useGetUsers } from '@/lib/react-query/queries';
import { levelPermissions } from '@/lib/levelPermissions';
import { qpShopCards, QPShopCard } from '@/lib/qpShopCards';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite/config';
import { updateUserLevelAndPoints } from '@/services/userService';
import { UserAction } from '@/lib/pointsMapping';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ShoppingBag, Gift, Zap, Star, Users, Sparkles, Crown, Heart, Palette, Megaphone, Check, ChevronDown, Search, X } from 'lucide-react';

// Icon mapping for cards
const cardIcons = {
  'custom-profile': <Palette className="w-5 h-5" />,
  'likes': <Heart className="w-5 h-5" />,
  'super-likes': <Star className="w-5 h-5" />,
  'username-colors': <Sparkles className="w-5 h-5" />,
  'gift-100': <Gift className="w-5 h-5" />,
  'gift-300': <Gift className="w-5 h-5" />,
  'gift-500': <Gift className="w-5 h-5" />,
  'advertisement': <Megaphone className="w-5 h-5" />,
};

// Color mapping for cards
const cardColors = {
  'custom-profile': 'from-primary-500 to-primary-600',
  'likes': 'from-pink-1 to-red',
  'super-likes': 'from-secondary-500 to-yellow-400',
  'username-colors': 'from-purple-500 to-primary-500',
  'gift-100': 'from-green-400 to-green-600',
  'gift-300': 'from-green-500 to-green-700',
  'gift-500': 'from-green-600 to-green-800',
  'advertisement': 'from-purple-500 to-purple-700',
};

interface activatedTest {
  cardId: string;
  activatedAt: string;
  remainingDays?: number;
  giftRecipientId?: string;
}

const QPShop = () => {
  const { data: user, isLoading: userLoading, isError: userError } = useGetCurrentUser();
  const { data: users, isLoading: usersLoading } = useGetUsers();
  const [activatedTest, setActivatedTest] = useState<activatedTest[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [selectedGiftRecipient, setSelectedGiftRecipient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [focusedUserIndex, setFocusedUserIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      let cardIds: string[] = [];
      if (typeof user.activatedTest === 'string') {
        try {
          const parsed = JSON.parse(user.activatedTest);
          if (Array.isArray(parsed)) {
            cardIds = parsed;
          } else {
            console.error('Parsed activatedTest is not an array:', parsed);
            cardIds = [];
          }
        } catch (error) {
          console.error('Error parsing activatedTest:', error);
          cardIds = [];
        }
      } else if (Array.isArray(user.activatedTest)) {
        cardIds = user.activatedTest;
      } else {
        console.error('activatedTest is neither a string nor an array:', user.activatedTest);
        cardIds = [];
      }

      const updatedCards = cardIds.map((cardId: string) => {
        const cardDef = qpShopCards.find((c) => c.id === cardId);
        const activatedAt = new Date().toISOString();
        let remainingDays: number | undefined;

        if (cardDef && cardDef.duration !== 'forever' && cardDef.duration !== 'instant') {
          const durationDays =
            cardDef.duration === '7days' || cardDef.duration === '1week' ? 7 : 30;
          const elapsedDays = Math.floor(
            (Date.now() - new Date(activatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          remainingDays = Math.max(0, durationDays - elapsedDays);
        }

        return {
          cardId,
          activatedAt,
          remainingDays,
          giftRecipientId: undefined,
        };
      }).filter((card: activatedTest) => !card.remainingDays || card.remainingDays > 0);
      setActivatedTest(updatedCards);
    }
  }, [user]);

  const userLevel = user.level || 1;
  const userQP = user.point || 0;
  const levelData = levelPermissions.find((perm) => perm.level === userLevel) || levelPermissions[0];
  const minQPForLevel = levelData.qpRange.min;
  const availableQP = Math.max(0, userQP - minQPForLevel);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(null);
        setSearchTerm('');
        setFocusedUserIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showDropdown]);

  if (userLoading || usersLoading) {
    return (
      <div className="min-h-screen min-w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary-500"></div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 p-4">
        <div className="bg-red-900 text-white rounded-lg p-6 max-w-4xl mx-auto">
          <p className="text-lg font-semibold">Error loading data. Please try again.</p>
          <button
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full bg-gradient-to-br p-4">
        <div className="bg-dark-3 text-white rounded-lg p-6 max-w-4xl mx-auto">
          <p className="text-lg font-semibold">Please log in.</p>
          <a
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  const handleActivate = async (card: QPShopCard) => {
    if (card.isGift && !selectedGiftRecipient) {
      toast({ title: 'Please select a recipient for the gift.' });
      return;
    }

    if (card.isGift) {
      const today = new Date().toISOString().split('T')[0];
      const todayGifts = activatedTest.filter(
        (ac) =>
          ac.cardId.startsWith('gift-') &&
          ac.activatedAt.startsWith(today)
      );
      const totalGiftedToday = todayGifts.reduce((sum, ac) => {
        const giftCard = qpShopCards.find((c) => c.id === ac.cardId);
        return sum + (giftCard ? giftCard.cost : 0);
      }, 0);

      if (totalGiftedToday + card.cost > 500) {
        toast({ title: 'Daily gift limit of 500 QP exceeded.' });
        return;
      }
    }

    try {
      const actionMap: { [key: string]: UserAction } = {
        'custom-profile': UserAction.ACTIVATE_CUSTOM_PROFILE,
        'likes': UserAction.ACTIVATE_LIKES,
        'super-likes': UserAction.ACTIVATE_SUPER_LIKES,
        'username-colors': UserAction.ACTIVATE_USERNAME_COLORS,
        'gift-100': UserAction.ACTIVATE_GIFT_100,
        'gift-300': UserAction.ACTIVATE_GIFT_300,
        'gift-500': UserAction.ACTIVATE_GIFT_500,
        'advertisement': UserAction.ACTIVATE_ADVERTISEMENT,
      };

      const action = actionMap[card.id];
      if (!action) {
        console.error('Invalid card ID:', card.id);
        throw new Error(`Invalid card ID: ${card.id}`);
      }

      const newActivatedTest: activatedTest = {
        cardId: card.id,
        activatedAt: new Date().toISOString(),
        remainingDays: card.duration === '7days' || card.duration === '1week' ? 7 : card.duration === '1month' ? 30 : undefined,
        giftRecipientId: card.isGift ? selectedGiftRecipient! : undefined,
      };

      const updatedCards = [...activatedTest, newActivatedTest];
      const cardIds = updatedCards.map((c) => c.cardId);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        user.$id,
        {
          activatedTest: JSON.stringify(cardIds),
        }
      );

      await updateUserLevelAndPoints(user.$id, action);

      setActivatedTest(updatedCards);
      setShowConfirmation(null);
      setSelectedGiftRecipient(null);
      setSearchTerm('');
      setShowDropdown(null);
      setFocusedUserIndex(-1);

      queryClient.invalidateQueries(['pointHistory', user.$id]);
      toast({ title: `Card "${card.title}" activated successfully!` });
    } catch (error) {
      console.error('Error activating card:', error);
      toast({ title: 'Failed to activate card. Please try again.' });
    }
  };

  const isCardAffordable = (cost: number) => availableQP >= cost;
  const isCardActivated = (cardId: string) => activatedTest.some((ac) => ac.cardId === cardId);

  const filteredUsers = users?.filter((u: any) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];


  const handleKeyDown = (e: React.KeyboardEvent, cardId: string) => {
    if (showDropdown !== cardId) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedUserIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedUserIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedUserIndex >= 0) {
      e.preventDefault();
      const selectedUser = filteredUsers[focusedUserIndex];
      if (selectedUser) {
        setSelectedGiftRecipient(selectedUser.$id);
        setShowDropdown(null);
        setSearchTerm('');
        setFocusedUserIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(null);
      setSearchTerm('');
      setFocusedUserIndex(-1);
    }
  };

  return (
    <div className="min-h-full  relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      {/* MODIFICATION: 
        1. Reduced top padding of the main content wrapper (py-8 to pt-4).
        2. Removed the entire 'Header Section' block which contained the large 'QP Shop' title and icon.
      */}
      <div className="relative z-10 container mx-auto px-4 pt-4 pb-8">
        
        {/* QP Status Card - Now the first element after the main wrapper padding */}
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-dark-3 to-dark-4 backdrop-blur-sm rounded-2xl p-6 border border-primary-500/20 shadow-2xl mb-12"> {/* Kept mb-12 for spacing before "Active Items" */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-800 dark:text-off-white text-lg font-semibold">Your QP Balance</p>
                <p className="text-light-3 text-sm">Level {userLevel} • {minQPForLevel} QP minimum</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                {userQP.toLocaleString()}
              </p>
              <p className="text-light-3 text-sm">
                {availableQP.toLocaleString()} QP available to spend
              </p>
            </div>
          </div>

          {/* QP Progress Bar */}
          <div className="w-full bg-dark-2 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((userQP / (levelData.qpRange.max || 4000)) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-light-3 text-xs">
            Progress to next level: {userQP}/{levelData.qpRange.max || 4000} QP
          </p>
        </div>

        {/* Activated Cards */}
        {activatedTest.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-off-white mb-6 flex items-center gap-2">
              <Crown className="w-6 h-6 text-purple-500" />
              Your Active Items
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activatedTest.map((ac) => {
                const card = qpShopCards.find((c) => c.id === ac.cardId);
                if (!card) return null;
                return (
                  <div
                    key={ac.cardId}
                    className="relative group bg-gradient-to-br from-dark-3 to-dark-4 rounded-xl p-4 border border-green-500/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                          {cardIcons[card.id as keyof typeof cardIcons]}
                        </div>
                        <h3 className="text-gray-800 dark:text-off-white font-semibold text-sm">{card.title}</h3>
                      </div>
                      <div className="p-1 bg-green-500 rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-light-3 text-sm mb-2">
                      {ac.remainingDays !== undefined ? `${ac.remainingDays} days left` : 'Permanent'}
                    </p>
                    {ac.giftRecipientId && (
                      <p className="text-light-3 text-xs">
                        Gifted to: {users?.find((u: any) => u.$id === ac.giftRecipientId)?.name || 'Unknown User'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shop Items */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-off-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            Available Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {qpShopCards.map((card) => {
              const canAfford = isCardAffordable(card.cost);
              const isActivated = isCardActivated(card.id);

              return (
                <div
                  key={card.id}
                  className={`relative group ${!canAfford && !isActivated ? 'opacity-60' : ''}`}
                >
                  {/* Card - ADDED FLEX, HEIGHT, MIN-HEIGHT CLASSES HERE */}
                  <div className="relative bg-gradient-to-br from-dark-3 to-dark-4 rounded-xl p-6 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/20 h-full min-h-[350px] flex flex-col justify-between">
                    {/* Card Content Wrapper - ensures content fills height */}
                    <div className="h-full">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-gradient-to-r ${cardColors[card.id as keyof typeof cardColors]} rounded-xl`}>
                        {cardIcons[card.id as keyof typeof cardIcons]}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-500">{card.cost}</p>
                        <p className="text-light-3 text-xs">QP</p>
                      </div>
                    </div>

                    {/* Card Content */}
                    <h3 className="text-gray-800 dark:text-off-white font-bold text-lg mb-2">{card.title}</h3>
                    {/* ADDED MIN-HEIGHT FOR CONSISTENT DESCRIPTION SPACE */}
                    <p className="text-light-3 text-sm mb-4 line-clamp-3 min-h-[48px]">{card.description}</p> 

                    {/* Duration and Limit Badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <div className="px-3 py-1 bg-dark-2 rounded-full">
                        <p className="text-light-3 text-xs font-medium">
                          {card.duration === 'forever' ? 'Permanent' :
                           card.duration === 'instant' ? 'Instant' :
                           card.duration === '1week' ? '1 Week' :
                           card.duration === '7days' ? '7 Days' : '1 Month'}
                        </p>
                      </div>
                      {card.isGift && (
                        <div className="px-3 py-1 bg-gradient-to-r from-pink-1 to-red rounded-full">
                          <p className="text-white text-xs font-medium">Gift</p>
                        </div>
                      )}
                      {card.limit && (
                        <div className="px-3 py-1 bg-dark-2 rounded-full">
                          <p className="text-light-3 text-xs font-medium">{card.limit}</p>
                        </div>
                      )}
                    </div>
                    </div> {/* End of card content wrapper */}

                    {/* Gift Recipient Selection */}
                    {card.isGift && canAfford && !isActivated && (
                      <div className="mb-4 relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-800 dark:text-off-white mb-2 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary-500" />
                          Select Gift Recipient
                        </label>
                        <button
                          onClick={() => setShowDropdown(showDropdown === card.id ? null : card.id)}
                          className={`w-full p-4 bg-gradient-to-r from-dark-2 to-dark-3 text-gray-800 dark:text-off-white border-2 rounded-xl text-sm flex justify-between items-center transition-all duration-300 group shadow-lg hover:shadow-primary-500/20 ${
                            showDropdown === card.id
                              ? 'border-primary-500 bg-gradient-to-r from-dark-1 to-dark-2 shadow-primary-500/30'
                              : 'border-primary-500/30 hover:border-primary-500/60'
                          }`}
                          onKeyDown={(e) => handleKeyDown(e, card.id)}
                        >
                          <span className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="text-gray-800 dark:text-off-white font-medium">
                                {selectedGiftRecipient
                                  ? users?.find((u: any) => u.$id === selectedGiftRecipient)?.name || 'Select recipient'
                                  : 'Choose a recipient'}
                              </div>
                              {selectedGiftRecipient && (
                                <div className="text-light-3 text-xs">
                                  Gift will be sent to this user
                                </div>
                              )}
                            </div>
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedGiftRecipient && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGiftRecipient(null);
                                  setSearchTerm('');
                                }}
                                className="p-1 hover:bg-dark-1 rounded-full transition-colors"
                              >
                                <X className="w-4 h-4 text-light-3 hover:text-red-500" />
                              </button>
                            )}
                            <ChevronDown
                              className={`w-5 h-5 text-primary-500 transition-transform duration-300 ${
                                showDropdown === card.id ? 'transform rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {showDropdown === card.id && (
                          <div className="absolute z-30 w-full mt-2 bg-gradient-to-br from-dark-3 to-dark-4 border-2 border-primary-500/40 rounded-xl shadow-2xl shadow-primary-500/20 max-h-72 overflow-hidden backdrop-blur-sm">
                            {/* Search Header */}
                            <div className="p-4 border-b border-primary-500/20 bg-gradient-to-r from-dark-2 to-dark-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                                <input
                                  type="text"
                                  placeholder="Search users by name..."
                                  value={searchTerm}
                                  onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setFocusedUserIndex(-1);
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, card.id)}
                                  className="w-full pl-11 pr-4 py-3 bg-dark-1 text-gray-800 dark:text-off-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 border border-primary-500/30 transition-all duration-300"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* User List */}
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                              {filteredUsers.length > 0 ? (
                                <div className="p-2">
                                  {filteredUsers.map((u: any, index: number) => (
                                    <div
                                      key={u.$id}
                                      onClick={() => {
                                        setSelectedGiftRecipient(u.$id);
                                        setShowDropdown(null);
                                        setSearchTerm('');
                                        setFocusedUserIndex(-1);
                                      }}
                                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-3 group ${
                                        index === focusedUserIndex
                                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                                          : 'hover:bg-dark-2 text-gray-800 dark:text-off-white'
                                      }`}
                                    >
                                      <div
                                       
                                      >
                                        <img      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                          index === focusedUserIndex
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                                        }`} src={u.imageUrl} alt={u.name} />
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{u.name}</div>
                                        <div
                                          className={`text-xs ${
                                            index === focusedUserIndex ? 'text-white/80' : 'text-light-3'
                                          }`}
                                        >
                                          Level {u.level || 1} • {u.point || 0} QP
                                        </div>
                                      </div>
                                      {selectedGiftRecipient === u.$id && (
                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                          <Check className="w-4 h-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-8 text-center">
                                  <div className="w-16 h-16 bg-dark-2 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-8 h-8 text-light-3" />
                                  </div>
                                  <div className="text-light-3 text-sm font-medium">No users found</div>
                                  <div className="text-light-3 text-xs mt-1">
                                    {searchTerm ? 'Try a different search term' : 'No users available'}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-primary-500/20 bg-gradient-to-r from-dark-2 to-dark-3">
                              <div className="flex items-center justify-between text-xs text-light-3">
                                <span>Use ↑↓ to navigate, Enter to select</span>
                                <span>{filteredUsers.length} users</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Activate Button */}
                    <button
                      onClick={() => canAfford && !isActivated && setShowConfirmation(card.id)}
                      disabled={!canAfford || isActivated}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        isActivated
                          ? 'bg-green-500 text-white cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-500 shadow-lg hover:shadow-primary-500/30'
                          : 'bg-dark-2 text-light-3 cursor-not-allowed'
                      }`}
                    >
                      {isActivated ? (
                        <span className="flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" />
                          Activated
                        </span>
                      ) : canAfford ? (
                        'Activate'
                      ) : (
                        'Insufficient QP'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
            <div className="bg-gradient-to-br from-dark-3 to-dark-4 p-8 rounded-2xl w-full max-w-md mx-4 border border-primary-500/30 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-off-white mb-2">Confirm Purchase</h3>
                <p className="text-light-3 text-sm">
                  Are you sure you want to activate{' '}
                  <span className="text-primary-500 font-semibold">
                    {qpShopCards.find((c) => c.id === showConfirmation)?.title}
                  </span>{' '}
                  for{' '}
                  <span className="text-secondary-500 font-semibold">
                    {qpShopCards.find((c) => c.id === showConfirmation)?.cost} QP
                  </span>
                  ?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const card = qpShopCards.find((c) => c.id === showConfirmation);
                    if (card) handleActivate(card);
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirmation(null)}
                  className="flex-1 py-3 px-4 bg-dark-2 text-gray-800 dark:text-off-white rounded-xl font-semibold hover:bg-dark-1 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QPShop;