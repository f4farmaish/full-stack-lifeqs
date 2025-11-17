import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface MembershipRequestsTableProps {
  requests: any[];
  onAcceptRequest: (requestId: string, groupId: string, userId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onSetPendingRequest: (requestId: string) => void;
}

const MembershipRequestsTable = ({
  requests,
  onAcceptRequest,
  onRejectRequest,
  onSetPendingRequest,
}: MembershipRequestsTableProps) => {
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);

  useEffect(() => {
    let filteredRequests = requests ? [...requests] : [];

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filteredRequests = filteredRequests.filter(
        (request) =>
          request.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filteredRequests = filteredRequests.filter(
        (request) => request.status === statusFilter
      );
    }

    // Sort requests: pending first, then by createdAt descending
    filteredRequests.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setSortedRequests(filteredRequests);
  }, [requests, searchQuery, statusFilter]);

  return (
    <div className="w-full max-w-[1200px] min-h-[550px] bg-dark-2 p-6 rounded-xl shadow-xl border border-dark-4">
      <div className="flex justify-between items-center mb-4 px-4">
        <input
          type="text"
          placeholder="Search by name or status..."
          className="bg-dark-3 text-light-1 px-3 py-2 rounded-md border border-dark-4 outline-none w-1/3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-light-3 text-sm">Filter by status:</label>
          <select
            className="bg-dark-3 text-light-1 px-3 py-1 rounded-md border border-dark-4 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "accepted" | "rejected")}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-light-3 text-sm">Rows:</label>
          <select
            className="bg-dark-3 text-light-1 px-3 py-1 rounded-md border border-dark-4 outline-none"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="border border-dark-4 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-light-3">
          <thead className="text-xs uppercase bg-dark-3 text-light-2 border-b border-dark-4">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Date</th>
              <th className="px-5 py-3 text-center">Admin</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRequests.slice(0, rowsPerPage).map((request) => (
              <tr
                key={request.$id}
                className="border-b border-dark-4 hover:bg-dark-4 transition-colors duration-200"
              >
                <td className="px-5 py-3 flex items-center gap-3 border-r border-dark-4">
                  <img
                    src={request.userImageUrl}
                    alt={request.userName}
                    className="w-8 h-8 rounded-full object-cover border border-gray-600"
                  />
                  <Link
                    to={`/profile/${request.userId[0]}`}
                    className="text-light-1 font-medium hover:underline"
                  >
                    {request.userName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-center border-r border-dark-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === "pending"
                        ? "bg-yellow-500 text-yellow-900"
                        : request.status === "accepted"
                        ? "bg-green-500 text-green-900"
                        : request.status === "rejected"
                        ? "bg-rose-900 text-white"
                        : "bg-gray-500 text-gray-900"
                    }`}
                  >
                    {request.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-center border-r border-dark-4">
                  {new Date(request.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-center border-r border-dark-4">
                  {request.adminName ? (
                    <Link
                      to={`/profile/${request.decidedBy}`}
                      className="text-light-1 hover:underline"
                    >
                      {request.adminName}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex justify-center gap-3">
                    {request.status === "pending" && (
                      <>
                        <button
                          className="px-4 py-2 bg-green-900 text-white font-medium rounded-md transition-all duration-200 shadow-sm"
                          onClick={() =>
                            onAcceptRequest(
                              request.$id,
                              request.groupId[0],
                              request.userId[0]
                            )
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="px-4 py-2 bg-rose-900 text-white font-medium rounded-md transition-all duration-200 shadow-sm"
                          onClick={() => onRejectRequest(request.$id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {request.status === "rejected" && (
                      <button
                        className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md"
                        onClick={() => onSetPendingRequest(request.$id)}
                      >
                        Pending
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembershipRequestsTable;