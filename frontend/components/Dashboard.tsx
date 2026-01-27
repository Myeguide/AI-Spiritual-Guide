import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { apiCall } from "@/utils/api-call";

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

type SubscriptionType = "all" | "free" | "one-time" | "premium-monthly" | "premium-yearly";
type SortField =
  | "firstName"
  | "email"
  | "dob"
  | "phoneNumber"
  | "createdAt"
  | "requestsUsedLifetime"
  | "questionsAsked"
  | "totalRequests";
type SortDirection = "asc" | "desc";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  dob: string | null;
  phoneNumber: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  activeSubscriptionId: string | null;
  requestsUsedLifetime: number;
  whatsappEnabled: boolean;
  subscriptionType: "free" | "one-time" | "premium-monthly" | "premium-yearly";
  questionsAsked: number;
  totalRequests: number;
}

const Dashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SubscriptionType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("firstName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall("/api/user/getUsers", "GET");
      console.log(response);

      if (!response.success) {
        throw new Error("Failed to fetch users");
      }

      const data = response.users;
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on active filter and search
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (activeFilter !== "all") {
      filtered = filtered.filter((u) => u.subscriptionType === activeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phoneNumber.includes(searchQuery)
      );
    }

    return filtered;
  }, [users, activeFilter, searchQuery]);

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      let aVal: string | number = a[sortField] as string | number;
      let bVal: string | number = b[sortField] as string | number;

      if (sortField === "firstName") {
        aVal = `${a.firstName} ${a.lastName}`;
        bVal = `${b.firstName} ${b.lastName}`;
      }

      if (sortField === "createdAt" || sortField === "dob") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortField, sortDirection]);

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-green-400 to-green-600",
      "from-orange-400 to-orange-600",
      "from-red-400 to-red-600",
    ];
    const index = parseInt(id.slice(-1), 36) % colors.length;
    return colors[index];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchUsers}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <Card className="border-0 shadow-none flex-1 flex flex-col min-h-0 bg-transparent">
        <CardContent className="p-3 sm:p-4 md:p-6 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              EternalGuide Users
            </h1>
            <span className="text-sm text-muted-foreground">
              Total: {users.length} users
            </span>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Users Subscription:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
                    activeFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border hover:bg-accent"
                  }`}
                >
                  {activeFilter === "all" && <Check className="w-4 h-4" />}
                  All
                </button>
                <button
                  onClick={() => setActiveFilter("free")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === "free"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border hover:bg-accent"
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => setActiveFilter("one-time")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === "one-time"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border hover:bg-accent"
                  }`}
                >
                  One-Time
                </button>
                <button
                  onClick={() => setActiveFilter("premium-monthly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === "premium-monthly"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border hover:bg-accent"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setActiveFilter("premium-yearly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === "premium-yearly"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border hover:bg-accent"
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Desktop Table View */}
            <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
              {/* Table Header - Fixed */}
              <div className="bg-muted border-b border-border flex-shrink-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[18%]"
                        onClick={() => handleSort("firstName")}
                      >
                        <div className="flex items-center gap-2">
                          Full Name
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "firstName" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[20%]"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "email" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[10%] hidden lg:table-cell"
                        onClick={() => handleSort("dob")}
                      >
                        <div className="flex items-center gap-2">
                          DOB
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "dob" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[14%]"
                        onClick={() => handleSort("phoneNumber")}
                      >
                        <div className="flex items-center gap-2">
                          Phone
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "phoneNumber" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[10%] hidden xl:table-cell"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-2">
                          Joined
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "createdAt" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[10%]"
                        onClick={() => handleSort("questionsAsked")}
                      >
                        <div className="flex items-center gap-2">
                          Question Asked
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "questionsAsked" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent w-[10%]"
                        onClick={() => handleSort("totalRequests")}
                      >
                        <div className="flex items-center gap-2">
                          Total Request
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortField === "totalRequests" && sortDirection === "desc" ? "rotate-180" : ""}`} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-[8%]">
                        WhatsApp
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              
              {/* Table Body - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-4 w-[18%]">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                                user.id
                              )} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                            >
                              {getInitials(user.firstName, user.lastName)}
                            </div>
                            <span className="text-sm text-foreground font-medium truncate">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[20%]">
                          <span className="text-sm text-muted-foreground truncate block">
                            {user.email}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%] hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(user.dob)}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[14%]">
                          <span className="text-sm text-muted-foreground">
                            {user.phoneNumber}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%] hidden xl:table-cell">
                          <span className="text-sm text-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%]">
                          <span className="text-sm text-foreground">
                            {user.questionsAsked}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%]">
                          <span className="text-sm text-foreground">
                            {user.totalRequests}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[8%]">
                          <div className="flex items-center justify-center">
                            {user.whatsappEnabled ? (
                              <WhatsAppIcon className="w-5 h-5 text-green-500" />
                            ) : (
                              <WhatsAppIcon className="w-5 h-5 text-muted-foreground/30" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3">
              {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-card border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                        user.id
                      )} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    {user.whatsappEnabled && (
                      <WhatsAppIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Phone</span>
                      <p className="text-foreground">{user.phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Joined</span>
                      <p className="text-foreground">{formatDate(user.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">DOB</span>
                      <p className="text-foreground">{formatDate(user.dob)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Question Asked</span>
                      <p className="text-foreground">{user.questionsAsked}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Total Request</span>
                      <p className="text-foreground">{user.totalRequests}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Subscription</span>
                      <p className="text-foreground capitalize">
                        {user.subscriptionType.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Displaying{" "}
              <span className="font-medium text-foreground">{paginatedUsers.length}</span> out
              of <span className="font-medium text-foreground">{sortedUsers.length}</span>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <span className="text-sm text-muted-foreground">
                {currentPage} - {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                &gt;
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
