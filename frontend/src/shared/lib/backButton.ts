/**
 * Module-level flag: modals set this to `true` while open to prevent
 * AppShell's BackButton handler from firing. The modal's own handler
 * then solely controls BackButton behaviour (e.g. closing the modal).
 */
export const backHandlerBlocked = { current: false };
