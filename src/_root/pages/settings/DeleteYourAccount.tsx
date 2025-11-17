import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetCurrentUser, useSignOutAccount } from '@/lib/react-query/queries';
import { suspendUser } from '@/services/userService';

// Component for handling account deletion with suspension
const DeleteYourAccount = () => {
  const { t } = useTranslation();
  const { data: currentUser } = useGetCurrentUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const navigate = useNavigate();
  const { mutate: signOut } = useSignOutAccount(); // Use sign-out mutation

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => suspendUser(userId),
    onSuccess: () => {
      setNotification({ message: t('settings.deleteAccount.accountSuspended'), type: 'success' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
      setIsDeleting(false);
      signOut(); // Trigger sign-out mutation
      navigate('/sign-in'); // Redirect to sign-in page
    },
    onError: (error: Error) => {
      setNotification({ message: `${t('settings.deleteAccount.suspensionFailed')}: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
      setIsDeleting(false);
      console.error('Error suspending account:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const handleDelete = async () => {
    if (window.confirm(t('settings.deleteAccount.confirmDelete'))) {
      if (window.confirm(t('settings.deleteAccount.confirmSuspension'))) {
        if (!currentUser) {
          setNotification({ message: t('settings.deleteAccount.userDataNotFound'), type: 'error' });
          return;
        }
        setIsDeleting(true);
        suspendMutation.mutate(currentUser.$id);
      }
    }
  };

  if (!currentUser) {
    return <div className="flex-center h-full bg-dark-2 text-light-1 h1-semibold px-6">Loading...</div>;
  }

  return (
    <div className="flex-center h-full bg-dark-2 px-6">
      <div className="w-full max-w-lg bg-dark-2 border-2 border-dark-4 bg-gradient-to-r from-dark-2 via-dark-3 to-dark-2 rounded-xl p-8 sm:p-10 shadow-xl animate-fade-in-up">
        <h2 className="h1-semibold text-light-1 mb-8 text-center">{t('settings.deleteAccount.title')}</h2>
        <p className="body-medium text-light-1 mb-6 text-center">
          {t('settings.deleteAccount.description')}
        </p>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full bg-gradient-to-r from-red to-red-600 text-light-1 font-semibold rounded-xl px-6 py-4 text-base hover:from-red-600 hover:to-red hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red focus:ring-offset-2 focus:ring-offset-dark-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isDeleting ? t('settings.deleteAccount.suspending') : t('settings.deleteAccount.deleteAccount')}
        </button>
        {notification.message && (
          <div
            className={`mt-6 p-4 rounded-xl base-regular text-center ${
              notification.type === 'success' ? 'bg-green-900 text-green-200 bg-opacity-90' : 'bg-red-900 text-red-200 bg-opacity-90'
            } animate-fade-in-up`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteYourAccount;