interface LockCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LockCommentsModal = ({
  isOpen,
  onClose,
  onConfirm,
}: LockCommentsModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-2 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold text-light-1 mb-4">Lock Comments</h2>
        <p className="text-light-2 mb-4">
          Are you sure you want to lock the comments on this content?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-bleu-1 hover:bg-blue-400 text-white rounded transition-colors">
            Confirm
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockCommentsModal;
