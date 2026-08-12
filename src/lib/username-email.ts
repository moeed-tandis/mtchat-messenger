/** Username → synthetic email mapping (shared by client and server). */
export const USER_EMAIL_DOMAIN = "mtchat.app";

export function emailForUsername(username: string) {
  return `${username.trim().toLowerCase()}@${USER_EMAIL_DOMAIN}`;
}
