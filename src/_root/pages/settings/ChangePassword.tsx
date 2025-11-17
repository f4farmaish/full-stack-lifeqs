import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updateUserPassword } from '@/services/authService';

const ChangePassword = () => {
  const { t } = useTranslation();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({ currentPassword: '', newPassword: '' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { currentPassword: '', newPassword: '' };

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = t('settings.changePassword.currentPasswordRequired');
      isValid = false;
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = t('settings.changePassword.newPasswordRequired');
      isValid = false;
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = t('settings.changePassword.passwordTooShort');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const updatePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => 
      updateUserPassword(currentPassword, newPassword),
    onSuccess: () => {
      setNotification({ message: t('settings.changePassword.passwordUpdatedSuccess'), type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
    },
    onError: (error: any) => {
      setNotification({ message: `${t('settings.changePassword.passwordUpdateFailed')}: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification({ message: '', type: null }), 3000);
    },
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      updatePasswordMutation.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
    }
  };

  return (
    <div className="flex-center h-full bg-dark-2 px-6">
      <div className="w-full max-w-lg bg-dark-2 border-2 border-dark-4 bg-gradient-to-r from-dark-2 via-dark-3 to-dark-2 rounded-xl p-8 sm:p-10 shadow-xl animate-fade-in-up">
        <h2 className="h1-semibold text-light-1 mb-8 text-center">{t('settings.changePassword.title')}</h2>
        <form onSubmit={handleSubmitPassword} className="space-y-8">
          <div>
            <label className="body-medium text-light-1 mb-3 block">{t('settings.changePassword.currentPassword')}</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={`w-full rounded-xl bg-dark-3 border ${errors.currentPassword ? 'border-red' : 'border-dark-4'} text-off-white px-5 py-4 text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-500 transition-all duration-300 placeholder:text-light-4`}
              placeholder={t('settings.changePassword.enterCurrentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-red base-regular mt-2">{errors.currentPassword}</p>
            )}
          </div>
          <div>
            <label className="body-medium text-light-1 mb-3 block">{t('settings.changePassword.newPassword')}</label>
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className={`w-full rounded-xl bg-dark-3 border ${errors.newPassword ? 'border-red' : 'border-dark-4'} text-off-white px-5 py-4 text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-500 transition-all duration-300 placeholder:text-light-4`}
              placeholder={t('settings.changePassword.enterNewPassword')}
            />
            {errors.newPassword && (
              <p className="text-red base-regular mt-2">{errors.newPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={updatePasswordMutation.isLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-light-1 font-semibold rounded-xl px-6 py-4 text-base hover:from-primary-500 hover:to-primary-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {updatePasswordMutation.isLoading ? t('settings.changePassword.updating') : t('settings.changePassword.updatePassword')}
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

export default ChangePassword;