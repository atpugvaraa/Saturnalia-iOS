// src/screens/App/Profile/UserOrdersScreen.tsx
import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, StatusBar } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserStore } from "@/state/userStore";
import { useThemeStore } from "@/state/themeStore";
import QRCode from 'react-native-qrcode-svg';

const UserOrdersScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const { userData: userProfile } = useUserStore();

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      /* Removed API call */
      setOrders([]);
    } catch (error) {
      console.error('Error fetching user orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
          color: '#22c55e',
          label: 'Confirmed',
        };
      case 'delivered':
        return {
          bg: isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE',
          color: '#41B8F0',
          label: 'Delivered',
        };
      case 'pending':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
          color: '#f59e0b',
          label: 'Pending',
        };
      case 'cancelled':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
          color: '#ef4444',
          label: 'Cancelled',
        };
      default:
        return {
          bg: isDark ? '#26262B' : '#F3F4F6',
          color: subTextColor,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    return order.status === activeFilter;
  });

  const FilterButton = ({ title, filterKey }: { title: string, filterKey: string }) => {
    const isSelected = activeFilter === filterKey;
    return (
      <TouchableOpacity
        style={{
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 10,
          borderWidth: 1.5,
          borderColor: isSelected ? '#41B8F0' : cardBorder,
          backgroundColor: isSelected ? (isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE') : cardBg,
        }}
        onPress={() => setActiveFilter(filterKey)}
      >
        <Text
          style={{
            fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
            color: isSelected ? '#41B8F0' : subTextColor,
            fontSize: 13,
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const OrderCard = ({ order }: { order: any }) => {
    const badge = getStatusBadge(order.status || 'pending');
    return (
      <View
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: cardBorder,
          borderRadius: 20,
          padding: 18,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textColor, fontSize: 16 }}>
            Order #{order.orderId ? order.orderId.slice(-8).toUpperCase() : 'N/A'}
          </Text>
          <View style={{ backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: badge.color, fontSize: 11 }}>
              {badge.label}
            </Text>
          </View>
        </View>

        {order.items && order.items.map((it: any, idx: number) => (
          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, fontSize: 13, flex: 1 }}>
              {it.name} {it.size ? `(${it.size})` : ''} x{it.quantity}
            </Text>
            <Text style={{ fontFamily: 'Poppins_500Medium', color: textColor, fontSize: 13 }}>
              ₹{it.price * (it.quantity || 1)}
            </Text>
          </View>
        ))}

        <View style={{ borderTopWidth: 1, borderTopColor: isDark ? '#2A2A30' : '#F3F4F6', marginVertical: 12 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, fontSize: 12 }}>Total Amount</Text>
            <Text style={{ fontFamily: 'Talina', color: '#41B8F0', fontSize: 20 }}>₹{order.totalAmount || 0}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedOrderId(order.orderId);
              setShowQRModal(true);
            }}
            style={{
              backgroundColor: '#41B8F0',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 13, marginLeft: 6 }}>
              View QR
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const QRModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showQRModal}
      onRequestClose={() => setShowQRModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 28, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Talina', color: textColor, fontSize: 20 }}>
              ORDER RECEIPT QR
            </Text>
            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#26262B' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <QRCode
              value={selectedOrderId || "NO_ORDER_ID"}
              size={180}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Order ID */}
          <View style={{ backgroundColor: isDark ? '#26262B' : '#F3F4F6', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, width: '100%', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_500Medium', color: subTextColor, fontSize: 11 }}>
              ORDER ID
            </Text>
            <Text style={{ fontFamily: 'Poppins_700Bold', color: textColor, fontSize: 15, marginTop: 2 }}>
              #{selectedOrderId ? selectedOrderId.slice(-8).toUpperCase() : 'N/A'}
            </Text>
          </View>

          <View style={{ backgroundColor: isDark ? 'rgba(65, 184, 240, 0.12)' : '#E0F2FE', borderRadius: 14, padding: 12, width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Ionicons name="information-circle-outline" size={18} color="#41B8F0" />
            <Text style={{ fontFamily: 'Poppins_400Regular', color: textColor, fontSize: 12, marginLeft: 8, flex: 1 }}>
              Show this QR code at the merchandise desk to collect your order.
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={{ backgroundColor: '#41B8F0', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' }}
            onPress={() => setShowQRModal(false)}
          >
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#41B8F0" />
        <Text style={{ fontFamily: 'Poppins_500Medium', color: subTextColor, marginTop: 16 }}>
          Loading your orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <QRModal />

      {/* Top Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 44),
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontFamily: "Talina", fontSize: 24, color: textColor, letterSpacing: 0.5 }}
          >
            MY ORDERS
          </Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: '#41B8F0' }}>
            Merchandise & Store Purchases
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton title="All" filterKey="all" />
          <FilterButton title="Confirmed" filterKey="confirmed" />
          <FilterButton title="Pending" filterKey="pending" />
          <FilterButton title="Delivered" filterKey="delivered" />
          <FilterButton title="Cancelled" filterKey="cancelled" />
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 64 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="cart-outline" size={40} color={subTextColor} />
            </View>
            <Text style={{ fontFamily: 'Talina', color: textColor, fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
              {activeFilter === 'all' ? 'NO ORDERS YET' : `NO ${activeFilter.toUpperCase()} ORDERS`}
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, textAlign: 'center', marginBottom: 24, lineHeight: 22, fontSize: 14 }}>
              {activeFilter === 'all'
                ? "You haven't placed any merchandise orders yet.\nCheck out the official fest store!"
                : `No orders found with status "${activeFilter}".`}
            </Text>

            {activeFilter === 'all' && (
              <TouchableOpacity 
                onPress={() => router.push("/store")}
                style={{ backgroundColor: '#41B8F0', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="shirt-outline" size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15, marginLeft: 8 }}>
                  Visit Merch Store
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            {filteredOrders.map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default UserOrdersScreen;
