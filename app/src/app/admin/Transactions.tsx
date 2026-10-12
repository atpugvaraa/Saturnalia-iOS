// src/screens/Admin/Transactions.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { ArrowLeft, CreditCard, CheckCircle2, Clock3, TrendingUp } from "lucide-react-native";
import { PaymentTransaction, TransactionFilters } from "@/types/adminTypes";
import {
  fetchTransactions,
  clearTransactionsCache,
  hasActiveFilters,
  updatePaymentStatus,
} from "@/api/admin";
import TransactionCard from "@/components/admin/TransactionCard";
import TransactionFiltersComponent from "@/components/admin/TransactionFilters";
import TransactionSearchBar from "@/components/admin/TransactionSearchBar";
import TransactionDetailModal from "@/components/admin/TransactionDetailModal";
import { showAlert } from "@/components";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";

const Transactions: React.FC = () => {
  const navigation = useAdminNavigation();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentTransaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [filters, setFilters] = useState<TransactionFilters>({
    searchTerm: "",
    statusFilter: "all",
    paymentTypeFilter: "all",
    dateRange: "all",
  });

  // Load transactions when filters change
  useEffect(() => {
    setSearchLoading(true);
    const timeoutId = setTimeout(() => {
      loadTransactions(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    filters.statusFilter,
    filters.paymentTypeFilter,
    filters.dateRange,
    filters.searchTerm,
  ]);

  const loadTransactions = async (loadMore: boolean = false) => {
    if (loadMore && (loadingMore || !hasMore)) return;

    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setSearchLoading(true);
      }

      const result = await fetchTransactions(filters, loadMore);

      if (loadMore) {
        setTransactions((prev) => [...prev, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }

      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError("Failed to load transactions. Please check your connection.");
      showAlert(
        "Error",
        "Failed to load transactions. Please check your connection and try again."
      );
    } finally {
      setSearchLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearTransactionsCache();
    try {
      await loadTransactions(false);
    } catch (err) {
      console.error("Error refreshing:", err);
    } finally {
      setRefreshing(false);
    }
  }, [filters]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(true);
    }
  };

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: "",
      statusFilter: "all",
      paymentTypeFilter: "all",
      dateRange: "all",
    });
  };

  const handleTransactionPress = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedTransaction(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setSearchLoading(true);
      await updatePaymentStatus(id, newStatus);
      showAlert("Success", `Payment marked as ${newStatus}`);
      handleCloseModal();
      handleRefresh();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update status");
      setSearchLoading(false);
    }
  };

  // Compute stats overview
  const stats = useMemo(() => {
    let settledRevenue = 0;
    let successCount = 0;
    let pendingCount = 0;

    for (const t of transactions) {
      if (t.status === "success") {
        settledRevenue += t.finalAmount || 0;
        successCount++;
      } else if (t.status === "pending") {
        pendingCount++;
      }
    }

    return {
      settledRevenue,
      successCount,
      pendingCount,
      totalCount: transactions.length,
    };
  }, [transactions]);

  const renderEmptyState = () => {
    const hasFilters = hasActiveFilters(filters);

    return (
      <View
        className="bg-white rounded-2xl p-8 items-center border border-[#A0B3D0] mx-4 my-8"
        style={{ boxShadow: "0px 4px 12px rgba(12, 53, 114, 0.06)" } as any}
      >
        <View className="w-16 h-16 rounded-full bg-[#EEB170]/20 items-center justify-center mb-3">
          <CreditCard size={32} color="#EEB170" />
        </View>
        <Text
          style={{ fontFamily: "Outfit_700Bold" }}
          className="text-[#0C3572] text-lg text-center"
        >
          {hasFilters ? "No matching transactions" : "No transactions recorded"}
        </Text>
        <Text
          style={{ fontFamily: "Outfit_400Regular" }}
          className="text-[#2175C0] text-center mt-1 text-xs px-4"
        >
          {hasFilters
            ? "Try resetting your search query or status filters."
            : "Incoming event and accommodation payments will appear here."}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={handleClearFilters}
            className="mt-4 bg-[#0C3572] px-4 py-2 rounded-xl"
            activeOpacity={0.7}
          >
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-white text-xs"
            >
              Reset Filters
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-transparent">
      {/* Header */}
      <View className="bg-[#EEB170] pt-6 rounded-b-3xl pb-6 px-6 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          className="w-10 h-10 rounded-full bg-[#FFFFFF40] items-center justify-center mr-3"
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#121212" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            style={{ fontFamily: "Outfit_700Bold" }}
            className="text-[#121212] text-2xl font-bold"
          >
            Payment Management
          </Text>
          <Text
            style={{ fontFamily: "Outfit_500Medium" }}
            className="text-[#121212] text-xs opacity-80 mt-0.5"
          >
            Track and verify transactions & settlements
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#EEB170"]}
            tintColor="#EEB170"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Stats Strip */}
        {transactions.length > 0 && (
          <View className="flex-row gap-2.5 px-4 pt-3 pb-1">
            {/* Total Settled */}
            <View
              className="flex-1 bg-white/90 border border-[#A0B3D0] rounded-2xl p-2.5 items-center"
              style={{ boxShadow: "0px 2px 8px rgba(12, 53, 114, 0.05)" } as any}
            >
              <View className="flex-row items-center mb-0.5">
                <TrendingUp size={12} color="#059669" />
                <Text
                  style={{ fontFamily: "Outfit_500Medium" }}
                  className="text-slate-500 text-[10px] uppercase ml-1"
                >
                  Settled
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Outfit_700Bold" }}
                className="text-[#0C3572] text-sm"
                numberOfLines={1}
              >
                ₹{stats.settledRevenue.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Success Count */}
            <View
              className="flex-1 bg-white/90 border border-[#A0B3D0] rounded-2xl p-2.5 items-center"
              style={{ boxShadow: "0px 2px 8px rgba(12, 53, 114, 0.05)" } as any}
            >
              <View className="flex-row items-center mb-0.5">
                <CheckCircle2 size={12} color="#10B981" />
                <Text
                  style={{ fontFamily: "Outfit_500Medium" }}
                  className="text-slate-500 text-[10px] uppercase ml-1"
                >
                  Success
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Outfit_700Bold" }}
                className="text-emerald-700 text-sm"
              >
                {stats.successCount}
              </Text>
            </View>

            {/* Pending Count */}
            <View
              className="flex-1 bg-white/90 border border-[#A0B3D0] rounded-2xl p-2.5 items-center"
              style={{ boxShadow: "0px 2px 8px rgba(12, 53, 114, 0.05)" } as any}
            >
              <View className="flex-row items-center mb-0.5">
                <Clock3 size={12} color="#F59E0B" />
                <Text
                  style={{ fontFamily: "Outfit_500Medium" }}
                  className="text-slate-500 text-[10px] uppercase ml-1"
                >
                  Pending
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Outfit_700Bold" }}
                className="text-amber-700 text-sm"
              >
                {stats.pendingCount}
              </Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <TransactionSearchBar
          searchTerm={filters.searchTerm}
          onSearchChange={(term) =>
            setFilters((prev) => ({ ...prev, searchTerm: term }))
          }
          loading={searchLoading}
        />

        {/* Filters */}
        <TransactionFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* Search Loading Indicator */}
        {searchLoading && (
          <View className="flex-row items-center justify-center py-4 mx-4">
            <ActivityIndicator size="small" color="#EEB170" />
            <Text
              style={{ fontFamily: "Outfit_500Medium" }}
              className="text-[#0C3572] ml-2 text-xs"
            >
              Filtering transactions...
            </Text>
          </View>
        )}

        {/* Results Header */}
        {!searchLoading && transactions.length > 0 && (
          <View className="px-4 pt-2 pb-2">
            <Text
              style={{ fontFamily: "Outfit_700Bold" }}
              className="text-[#0C3572] text-sm"
            >
              {transactions.length} Transaction{transactions.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* Transactions List */}
        {transactions.length > 0 ? (
          <>
            {transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id || transaction.merchantOrderId}
                transaction={transaction}
                onPress={handleTransactionPress}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <View className="px-4 py-3">
                <TouchableOpacity
                  onPress={handleLoadMore}
                  className="bg-[#0C3572] py-3.5 rounded-2xl shadow-sm"
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="#EEB170" />
                      <Text
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                        className="text-white ml-2 text-sm"
                      >
                        Loading more transactions...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                      className="text-white text-center text-sm"
                    >
                      Load More Transactions
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* End of results message */}
            {!hasMore && transactions.length > 0 && (
              <View className="px-4 py-3">
                <View className="bg-white/60 border border-[#A0B3D0]/60 rounded-xl p-2.5">
                  <Text
                    style={{ fontFamily: "Outfit_500Medium" }}
                    className="text-[#2175C0] text-center text-xs"
                  >
                    All {transactions.length} transactions loaded
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          !searchLoading && renderEmptyState()
        )}

        {/* Error State */}
        {error && (
          <View className="mx-4 mb-4">
            <View className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <Text
                style={{ fontFamily: "Outfit_500Medium" }}
                className="text-rose-700 text-center text-xs"
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => loadTransactions(false)}
                className="mt-3 bg-[#0C3572] py-2 px-4 rounded-xl self-center"
                activeOpacity={0.7}
              >
                <Text
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                  className="text-white text-xs"
                >
                  Retry Loading
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={handleCloseModal}
        onUpdateStatus={handleUpdateStatus}
      />
    </View>
  );
};

export default Transactions;
