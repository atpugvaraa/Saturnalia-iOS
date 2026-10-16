import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '@/state/themeStore';
import { useAdminDrawerStore } from '@/state/adminDrawerStore';
import { useUserStore } from '@/state/userStore';
import { isUserAdmin } from '@/utils/roles';
import { fetchStoreItems, StoreItem } from '@/api/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CENTER_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.58, 226);
const CENTER_CARD_HEIGHT = 285;
const SIDE_CARD_HEIGHT = 230; // Shorter height than center card
const SIDE_OVERFLOW = 42; // Extends out of the screen
const SIDE_GAP = 14;
const SIDE_CARD_WIDTH = Math.max((SCREEN_WIDTH - CENTER_CARD_WIDTH - (SIDE_GAP * 2)) / 2 + SIDE_OVERFLOW, 85);

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  priceText: string;
  description: string;
  image?: string;
  imageUrl?: string;
}

const ProductCardImage: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <Image
        source={require('@/assets/question.png')}
        style={{ width: '80%', height: '80%', alignSelf: 'center' }}
        resizeMode="contain"
      />
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={{ width: '85%', height: '85%', alignSelf: 'center', borderRadius: 14 }}
      resizeMode="contain"
      onError={() => setHasError(true)}
    />
  );
};

/**
 * Geometric Jaali / Lattice pattern overlay matching the reference mockup
 */
const JaaliOverlay: React.FC<{
  color?: string;
  cardWidth?: number;
  cardHeight?: number;
}> = ({
  color = 'rgba(0, 0, 0, 0.22)',
  cardWidth = 220,
  cardHeight = 280,
}) => {
  const tileW = 34;
  const tileH = 46;
  const cols = Math.ceil(cardWidth / tileW) + 2;
  const rows = Math.ceil(cardHeight / tileH) + 2;

  const paths: React.ReactNode[] = [];
  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const offsetX = c * tileW + (r % 2 === 0 ? 0 : tileW / 2);
      const offsetY = r * tileH;
      paths.push(
        <Path
          key={`${r}-${c}`}
          d={`M ${offsetX + 17},${offsetY} C ${offsetX + 17},${offsetY + 11.5} ${offsetX + 34},${offsetY + 11.5} ${offsetX + 34},${offsetY + 23} C ${offsetX + 34},${offsetY + 34.5} ${offsetX + 17},${offsetY + 34.5} ${offsetX + 17},${offsetY + 46} C ${offsetX + 17},${offsetY + 34.5} ${offsetX},${offsetY + 34.5} ${offsetX},${offsetY + 23} C ${offsetX},${offsetY + 11.5} ${offsetX + 17},${offsetY + 11.5} ${offsetX + 17},${offsetY} Z`}
          fill="none"
          stroke={color}
          strokeWidth="1.2"
        />
      );
    }
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%">
        {paths}
      </Svg>
    </View>
  );
};

const StoreScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { openDrawer } = useAdminDrawerStore();
  const { userData } = useUserStore();
  const canSeeAdmin = isUserAdmin(userData);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const loadProducts = async () => {
    try {
      const items = await fetchStoreItems();
      const mapped: StoreProduct[] = items.map((it: StoreItem) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        priceText: `Rs. ${it.price}`,
        description: it.description,
        image: it.image || it.imageUrl,
        imageUrl: it.image || it.imageUrl,
      }));
      setProducts(mapped);
    } catch (e) {
      console.error('Error fetching store items:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#131316' : '#E0E0E0' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header: Search Pill + Profile Avatar Button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 8, 16),
          paddingBottom: 10,
          gap: 12,
        }}
      >
        {/* Hamburger Menu - only for admin/staff */}
        {canSeeAdmin && (
          <TouchableOpacity
            onPress={openDrawer}
            activeOpacity={0.75}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? '#1C1C20' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Ionicons name="menu" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        )}

        {/* Search Item Pill */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#1C1C20' : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: '#CCCCCC',
            borderRadius: 9999,
            paddingHorizontal: 16,
            height: 46,
            gap: 10,
          }}
        >
          <Ionicons name="search" size={18} color={isDark ? '#8E8E93' : '#666666'} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Item"
            placeholderTextColor={isDark ? '#8E8E93' : '#666666'}
            style={{
              flex: 1,
              color: isDark ? '#FFFFFF' : '#000000',
              fontFamily: 'Poppins_500Medium',
              fontSize: 14,
              padding: 0,
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#8E8E93' : '#666666'} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Profile Avatar Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/profile')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: '#38BDF8',
            backgroundColor: isDark ? '#1C1C20' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Ionicons name="person" size={26} color={isDark ? '#9CA3AF' : '#0C3572'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 110,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />
        }
      >
        {/* Hero Section: The SAT Store Banner with store1 & store2 graphics */}
        <View
          style={{
            position: 'relative',
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 115,
            marginBottom: 10,
          }}
        >
          {/* Left: Dome & Peacock illustration (store1.png) */}
          <Image
            source={require('@/assets/store1.png')}
            style={{
              position: 'absolute',
              left: 4,
              bottom: 4,
              width: 72,
              height: 98,
            }}
            resizeMode="contain"
          />

          {/* Right: Bougainvillea floral vine (store2.png) */}
          <Image
            source={require('@/assets/store2.png')}
            style={{
              position: 'absolute',
              right: 2,
              top: -6,
              width: 52,
              height: 112,
            }}
            resizeMode="contain"
          />

          {/* Center Titles */}
          <Text
            style={{
              fontFamily: 'Talina',
              fontSize: 34,
              color: '#38BDF8',
              letterSpacing: 0.4,
              textAlign: 'center',
            }}
          >
            The SAT Store
          </Text>
          <Text
            style={{
              fontFamily: 'Talina',
              fontSize: 16,
              color: isDark ? '#FFFFFF' : '#000000',
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            For Memories That Stay
          </Text>
        </View>

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text
              style={{
                fontFamily: 'Poppins_400Regular',
                color: isDark ? '#9CA3AF' : '#666666',
                fontSize: 13,
                marginTop: 10,
              }}
            >
              Loading festival store...
            </Text>
          </View>
        )}

        {/* Products List */}
        {!loading && filteredProducts.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <Ionicons name="search-outline" size={48} color="#71717A" />
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                color: '#9CA3AF',
                fontSize: 15,
                marginTop: 12,
              }}
            >
              No products found matching "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={{ gap: 32 }}>
            {filteredProducts.map((product) => {
              const isBookmarked = bookmarkedIds.has(product.id);

              return (
                <View key={product.id} style={{ alignItems: 'center' }}>
                  {/* 3-Rectangle Row (Left: Olive, Center: Dark Green / Product, Right: Magenta) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: SCREEN_WIDTH,
                    }}
                  >
                    {/* Left Olive / Gold Card (shorter & overflows out of screen) */}
                    <View
                      style={{
                        width: SIDE_CARD_WIDTH,
                        height: SIDE_CARD_HEIGHT,
                        borderRadius: 20,
                        backgroundColor: '#7A6D24',
                        overflow: 'hidden',
                        marginLeft: -SIDE_OVERFLOW,
                        marginRight: SIDE_GAP,
                      }}
                    >
                      <JaaliOverlay
                        color="rgba(0, 0, 0, 0.22)"
                        cardWidth={SIDE_CARD_WIDTH}
                        cardHeight={SIDE_CARD_HEIGHT}
                      />
                    </View>

                    {/* Center Main Card (Displays Product Image with question.png fallback) */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        router.push({
                          pathname: '/store/ItemDetails',
                          params: { itemId: product.id },
                        });
                      }}
                      style={{
                        width: CENTER_CARD_WIDTH,
                        height: CENTER_CARD_HEIGHT,
                        borderRadius: 22,
                        backgroundColor: '#172E1E',
                        overflow: 'hidden',
                        position: 'relative',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.45,
                        shadowRadius: 10,
                        elevation: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <JaaliOverlay
                        color="rgba(0, 0, 0, 0.2)"
                        cardWidth={CENTER_CARD_WIDTH}
                        cardHeight={CENTER_CARD_HEIGHT}
                      />

                      {/* Price Badge Pill in Top-Left */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.52)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 10,
                          zIndex: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Poppins_500Medium',
                            fontSize: 13,
                            color: '#D1D5DB',
                          }}
                        >
                          {product.priceText}
                        </Text>
                      </View>

                      {/* Bookmark Icon in Top-Right */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => toggleBookmark(product.id)}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.52)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 5,
                        }}
                      >
                        <Ionicons
                          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                          size={17}
                          color={isBookmarked ? '#38BDF8' : '#D1D5DB'}
                        />
                      </TouchableOpacity>

                      {/* Product Image with question.png fallback */}
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingTop: 36,
                          paddingBottom: 16,
                          paddingHorizontal: 14,
                        }}
                      >
                        <ProductCardImage imageUrl={product.image || product.imageUrl} />
                      </View>
                    </TouchableOpacity>

                    {/* Right Magenta / Pink Card (shorter & overflows out of screen) */}
                    <View
                      style={{
                        width: SIDE_CARD_WIDTH,
                        height: SIDE_CARD_HEIGHT,
                        borderRadius: 20,
                        backgroundColor: '#B01866',
                        overflow: 'hidden',
                        marginLeft: SIDE_GAP,
                        marginRight: -SIDE_OVERFLOW,
                      }}
                    >
                      <JaaliOverlay
                        color="rgba(0, 0, 0, 0.22)"
                        cardWidth={SIDE_CARD_WIDTH}
                        cardHeight={SIDE_CARD_HEIGHT}
                      />
                    </View>
                  </View>

                  {/* Product Title */}
                  <Text
                    style={{
                      fontFamily: 'Poppins_700Bold',
                      fontSize: 18,
                      color: isDark ? '#FFFFFF' : '#000000',
                      textAlign: 'center',
                      marginTop: 14,
                      marginBottom: 4,
                    }}
                  >
                    {product.name}
                  </Text>

                  {/* Product Description */}
                  <Text
                    style={{
                      fontFamily: 'Poppins_400Regular',
                      fontSize: 13,
                      color: isDark ? '#9CA3AF' : '#555555',
                      textAlign: 'center',
                      lineHeight: 18,
                      maxWidth: 290,
                      paddingHorizontal: 16,
                    }}
                  >
                    {product.description}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StoreScreen;
