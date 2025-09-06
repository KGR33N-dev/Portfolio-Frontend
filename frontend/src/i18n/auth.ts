import { useTranslations } from '~/i18n/utils';
import { ui } from '~/i18n';

export function getAuthTranslations(lang: keyof typeof ui) {
  const t = useTranslations(lang);
  return {
    // UI Labels and messages (not API errors)
    creatingAccount: t('auth.creatingAccount'),
    registerButton: t('auth.registerButton'),
    sendingResetLink: t('auth.sendingResetLink'),
    enterEmailAddress: t('auth.enterEmailAddress'),
    sendResetLink: t('auth.sendResetLink'),
    resettingPassword: t('auth.resettingPassword'),
    goToLogin: t('auth.goToLogin'),
    requestNewLink: t('auth.requestNewLink'),
    resetPassword: t('auth.resetPassword'),
    signingIn: t('auth.signingIn'),
    fillAllFields: t('auth.fillAllFields'),
    loginButton: t('auth.loginButton'),
  };
}
