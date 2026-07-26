import { ERROR_TIMEOUT } from '@modules/shared/constants/ErrorTimeout';

export const cleanError = (fnError: (value: string) => void) => {
  setTimeout(() => {
    fnError('');
  }, ERROR_TIMEOUT);
}
