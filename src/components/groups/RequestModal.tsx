import MembershipRequestsTable from "@/components/groups/MembershipRequestsTable";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: any[];
  handleAcceptRequest: (
    requestId: string,
    groupId: string,
    userId: string
  ) => void;
  handleRejectRequest: (requestId: string) => void;
  handleSetPendingRequest: (requestId: string) => void;
}

const RequestModal = ({
  isOpen,
  onClose,
  requests,
  handleAcceptRequest,
  handleRejectRequest,
  handleSetPendingRequest,
}: RequestModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end z-50 p-4">
      <div className="bg-dark-2 p-6 rounded-xl shadow-xl w-full max-w-[1200px] min-h-[480px] overflow-hidden relative border border-dark-4 mb-5">
        <button
          className="absolute top-0 right-3 text-light-3 hover:text-light-1 text-xl transition-transform transform hover:scale-110"
          onClick={onClose}>
          ✖
        </button>

        <MembershipRequestsTable
          requests={requests}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onSetPendingRequest={handleSetPendingRequest}
        />
      </div>
    </div>
  );
};

export default RequestModal;
