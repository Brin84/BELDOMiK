/**
 * Module-level flag: modals set this to `true` while open to prevent
 * AppShell's BackButton handler from firing. The modal's own handler
 * then solely controls BackButton behaviour (e.g. closing the modal).
 */
export const backHandlerBlocked = { current: false };

/**
 * Module-level flag: full-screen pickers (тип недвижимости, ремонт)
 * open on top of a modal. While a picker is open, the modal below must
 * not react to the Telegram BackButton — the picker closes instead.
 */
export const pickerOverlayOpen = { current: false };
