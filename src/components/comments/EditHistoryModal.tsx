import React from "react";

interface EditHistoryItem {
  content: string;
  timestamp: string;
}

interface EditHistoryModalProps {
  history: EditHistoryItem[];
  onClose: () => void;
}

const EditHistoryModal: React.FC<EditHistoryModalProps> = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-dark-3 rounded-md p-6 max-w-2xl w-full max-h-[80%] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-lg hover:text-gray-300"
        >
          ×
        </button>

        <h3 className="text-lg font-bold text-white mb-4">Edit History</h3>

        <ul className="space-y-4">
          {history.map((edit, index) => (
            <li key={index} className="text-sm text-gray-300">
              <p>{edit.content}</p>
              <span className="italic text-gray-500">{edit.timestamp}</span>
              {index < history.length - 1 && (
                <hr className="my-2 border-gray-600" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EditHistoryModal;
