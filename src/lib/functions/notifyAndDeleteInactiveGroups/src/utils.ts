export const groupInactivityConfig = {
  INACTIVITY_WARNING_PERIOD: parseInt(process.env.INACTIVITY_WARNING_PERIOD || "180"), // 6 months (in days)
  INACTIVITY_DELETION_PERIOD: parseInt(process.env.INACTIVITY_DELETION_PERIOD || "181"), // 6 months + 1 day (in days)
};