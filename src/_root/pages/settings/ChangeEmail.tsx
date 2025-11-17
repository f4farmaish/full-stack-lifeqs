import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useGetAccount, useGetCurrentUser } from '@/lib/react-query/queries';
import { updateUserEmail } from '@/services/authService';

const ChangeEmail = () => {
  const { t } = useTranslation();
  const { data: account } = useGetAccount();
  const { data: currentUser } = useGetCurrentUser();
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' });
  const [errors, setErrors] = useState({ currentPassword: '', newEmail: '' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { currentPassword: '', newEmail: '' };

    if (!emailForm.currentPassword) {
      newErrors.currentPassword = t('settings.changeEmail.currentPasswordRequired');
      isValid = false;
    }
    if (!emailForm.newEmail) {
      newErrors.newEmail = t('settings.changeEmail.newEmailRequired');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) {
      newErrors.newEmail = t('settings.changeEmail.invalidEmail');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const updateEmailMutation = useMutation({
    mutationFn: ({ newEmail, password }: { newEmail: string; password: string }) => 
      updateUserEmail(
        account?.$id || '',
        currentUser?.email || '',
        newEmail,
        password
      ),
    onSuccess: () => {
      setNotification({ message: t('settings.changeEmail.emailUpdatedSuccess'), type: 'success' });
      setEmailForm({ currentPassword: '', newEmail: '' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
    },
    onError: (error: any) => {
      setNotification({ message: `${t('settings.changeEmail.emailUpdateFailed')}: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
    },
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      updateEmailMutation.mutate({ newEmail: emailForm.newEmail, password: emailForm.currentPassword });
    }
  };

  if (!account || !currentUser) {
    return <div className="flex-center h-full bg-dark-2 text-light-1 h1-semibold px-6">{t('settings.changeEmail.loading')}</div>;
  }

  return (
    <div className="flex-center h-full bg-dark-2 px-6">
      <div className="w-full max-w-lg bg-dark-2 border-2 border-dark-4 bg-gradient-to-r from-dark-2 via-dark-3 to-dark-2 rounded-xl p-8 sm:p-10 shadow-xl animate-fade-in-up">
        <h2 className="h1-semibold text-light-1 mb-8 text-center">{t('settings.changeEmail.title')}</h2>
        <form onSubmit={handleSubmitEmail} className="space-y-8">
          <div>
            <label className="body-medium text-light-1 mb-3 block">{t('settings.changeEmail.currentPassword')}</label>
            <input
              type="password"
              name="currentPassword"
              value={emailForm.currentPassword}
              onChange={handleEmailChange}
              className={`w-full rounded-xl bg-dark-3 border ${errors.currentPassword ? 'border-red' : 'border-dark-4'} text-off-white px-5 py-4 text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-500 transition-all duration-300 placeholder:text-light-4`}
              placeholder={t('settings.changeEmail.enterCurrentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-red base-regular mt-2">{errors.currentPassword}</p>
            )}
          </div>
          <div>
            <label className="body-medium text-light-1 mb-3 block">{t('settings.changeEmail.newEmail')}</label>
            <input
              type="email"
              name="newEmail"
              value={emailForm.newEmail}
              onChange={handleEmailChange}
              className={`w-full rounded-xl bg-dark-3 border ${errors.newEmail ? 'border-red' : 'border-dark-4'} text-off-white px-5 py-4 text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-500 transition-all duration-300 placeholder:text-light-4`}
              placeholder={t('settings.changeEmail.enterNewEmail')}
            />
            {errors.newEmail && (
              <p className="text-red base-regular mt-2">{errors.newEmail}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={updateEmailMutation.isLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-light-1 font-semibold rounded-xl px-6 py-4 text-base hover:from-primary-500 hover:to-primary-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {updateEmailMutation.isLoading ? t('settings.changeEmail.updating') : t('settings.changeEmail.updateEmail')}
          </button>
        </form>
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

export default ChangeEmail;