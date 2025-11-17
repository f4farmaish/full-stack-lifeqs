import { LockCommentsButtonProps } from "@/types";

const LockCommentsButton = ({
  isLocked,
  canUnlock,
  handleLockOpen,
  handleUnlock,
  canLock,
}: LockCommentsButtonProps) => {
  return (
    <>
      {isLocked
        ? canUnlock && (
            <button
              onClick={handleUnlock}
              className="p-2 bg-red-500 hover:bg-red-600 rounded transition-colors duration-200"
              title="Unlock Comments">
              <img
                src="/assets/icons/unlock.svg"
                alt="unlock"
                width={18}
                height={18}
                className="text-white"
              />
            </button>
          )
        : canLock && (
            <button
              onClick={handleLockOpen}
              className="p-2"
              title="Lock Comments">
              <img
                src="/assets/icons/lock.svg"
                alt="lock"
                width={18}
                height={18}
                className="text-white"
              />
            </button>
          )}
    </>
  );
};

export default LockCommentsButton;
