import { ERROR_TIMEOUT } from "../constants/ErrorTimeout";

export const cleanError = (fnError: (value: string) => void) => {
  setTimeout(() => {
    fnError('');
  }, ERROR_TIMEOUT);
}