// src/screens/Admin/Transactions.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
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
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Transactions: React.FC = () => {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentTransaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

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

  const handleFiltersChange = useCallback(
    (newFilters: Partial<TransactionFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      statusFilter: "all",
      paymentTypeFilter: "all",
      dateRange: "all",
    });
  }, []);

  const handleTransactionPress = useCallback(
    (transaction: PaymentTransaction) => {
      setSelectedTransaction(transaction);
      setModalVisible(true);
    },
    []
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  const handleUpdateStatus = useCallback(
    async (
      transactionId: string,
      status: "success" | "pending" | "failed",
      remarks?: string
    ) => {
      try {
        const updated = await updatePaymentStatus(
          transactionId,
          status,
          remarks
        );
        if (updated) {
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === transactionId || t.merchantOrderId === transactionId
                ? { ...t, status }
                : t
            )
          );
          if (selectedTransaction) {
            setSelectedTransaction((prev) => (prev ? { ...prev, status } : null));
          }
          showAlert("Success", `Status updated to ${status}`);
        } else {
          showAlert("Error", "Failed to update transaction status");
        }
      } catch (err) {
        console.error("Error updating status:", err);
        showAlert("Error", "Failed to update transaction status");
      }
    },
    [selectedTransaction]
  );

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
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          padding: 28,
          alignItems: "center",
          borderWidth: 1,
          borderColor: cardBorder,
          marginHorizontal: 16,
          marginVertical: 24,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#41B8F020",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <CreditCard size={28} color="#41B8F0" />
        </View>
        <Text
          style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16, textAlign: "center" }}
        >
          {hasFilters ? "No matching transactions" : "No transactions recorded"}
        </Text>
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            color: textSecondary,
            textAlign: "center",
            marginTop: 4,
            fontSize: 12,
            paddingHorizontal: 16,
          }}
        >
          {hasFilters
            ? "Try resetting your search query or status filters."
            : "Incoming event and accommodation payments will appear here."}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={handleClearFilters}
            style={{
              marginTop: 14,
              backgroundColor: "#41B8F0",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 13 }}
            >
              Reset Filters
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
          backgroundColor: bgColor,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Talina",
              fontSize: 22,
              color: textPrimary,
              letterSpacing: 0.5,
            }}
          >
            Payment Management
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Track and verify transactions & settlements
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#41B8F0"]}
            tintColor="#41B8F0"
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Stats Strip */}
        {transactions.length > 0 && (
          <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
            {/* Total Settled */}
            <View
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: 16,
                padding: 10,
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <TrendingUp size={12} color="#10B981" />
                <Text
                  style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 10, textTransform: "uppercase", marginLeft: 4 }}
                >
                  Settled
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 14 }}
                numberOfLines={1}
              >
                ₹{stats.settledRevenue.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Success Count */}
            <View
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: 16,
                padding: 10,
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <CheckCircle2 size={12} color="#10B981" />
                <Text
                  style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 10, textTransform: "uppercase", marginLeft: 4 }}
                >
                  Success
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: "#10B981", fontSize: 14 }}
              >
                {stats.successCount}
              </Text>
            </View>

            {/* Pending Count */}
            <View
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: 16,
                padding: 10,
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <Clock3 size={12} color="#F59E0B" />
                <Text
                  style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 10, textTransform: "uppercase", marginLeft: 4 }}
                >
                  Pending
                </Text>
              </View>
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: "#F59E0B", fontSize: 14 }}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
            <ActivityIndicator size="small" color="#41B8F0" />
            <Text
              style={{ fontFamily: "Poppins_500Medium", color: textSecondary, marginLeft: 8, fontSize: 12 }}
            >
              Filtering transactions...
            </Text>
          </View>
        )}

        {/* Results Header */}
        {!searchLoading && transactions.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13 }}
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
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity
                  onPress={handleLoadMore}
                  style={{
                    backgroundColor: "#41B8F0",
                    paddingVertical: 14,
                    borderRadius: 14,
                  }}
                  disabled={loadingMore}
                  activeOpacity={0.8}
                >
                  {loadingMore ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8, fontSize: 13 }}
                      >
                        Loading more transactions...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", textAlign: "center", fontSize: 14 }}
                    >
                      Load More Transactions
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* End of results message */}
            {!hasMore && transactions.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <Text
                    style={{ fontFamily: "Poppins_500Medium", color: textSecondary, textAlign: "center", fontSize: 12 }}
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
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                borderWidth: 1,
                borderColor: "#EF444450",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Text
                style={{ fontFamily: "Poppins_500Medium", color: "#EF4444", textAlign: "center", fontSize: 12 }}
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => loadTransactions(false)}
                style={{
                  marginTop: 10,
                  backgroundColor: "#EF4444",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  alignSelf: "center",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 12 }}
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
        onUpdateStatus={(id, newStatus) => handleUpdateStatus(id, newStatus as any)}
      />
    </View>
  );
};

export default Transactions;
