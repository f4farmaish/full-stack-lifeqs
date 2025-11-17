"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postInactivityConfig = exports.groupInactivityConfig = void 0;
exports.groupInactivityConfig = {
    INACTIVITY_WARNING_PERIOD: parseInt(process.env.INACTIVITY_WARNING_PERIOD || "180"),
    INACTIVITY_DELETION_PERIOD: parseInt(process.env.INACTIVITY_DELETION_PERIOD || "181"),
};
exports.postInactivityConfig = {
    INACTIVITY_LOCK_PERIOD: parseInt(process.env.INACTIVITY_POST_LOCK_DAYS || "90"),
};
