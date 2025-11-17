export const groupInactivityConfig = {
  INACTIVITY_WARNING_PERIOD: parseInt(process.env.INACTIVITY_WARNING_PERIOD || "180"),
  INACTIVITY_DELETION_PERIOD: parseInt(process.env.INACTIVITY_DELETION_PERIOD || "181"),
};
export const postInactivityConfig = {
  INACTIVITY_LOCK_PERIOD: parseInt(process.env.INACTIVITY_POST_LOCK_DAYS || "90"),
};