import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, Clock, CreditCard, XCircle, Users, User, Calendar, Tag } from 'lucide-react-native';
import { useThemeStore } from '@/state/themeStore';

interface RegistrationStatusCardProps {
  status: 'confirmed' | 'awaited' | 'payment_pending' | 'rejected' | 'pending';
  eventCategory?: string;
  eventType: 'team' | 'individual';
  registeredAt: string;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  currentTeamSize?: number | null;
}

const RegistrationStatusCard: React.FC<RegistrationStatusCardProps> = ({
  status,
  eventCategory,
  eventType,
  registeredAt,
  minTeamSize,
  maxTeamSize,
  currentTeamSize,
}) => {
  const { isDark } = useThemeStore();

  const cardBg = isDark ? '#1C1C22' : '#FFFFFF';
  const cardBorder = isDark ? '#2B2B34' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <CheckCircle2 size={14} color="#10B981" />,
          title: 'Confirmed',
          textColor: '#10B981',
          bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
        };
      case 'payment_pending':
        return {
          icon: <CreditCard size={14} color="#FFBA00" />,
          title: 'Payment Pending',
          textColor: '#FFBA00',
          bgColor: isDark ? 'rgba(255, 186, 0, 0.12)' : 'rgba(255, 186, 0, 0.12)',
          borderColor: 'rgba(255, 186, 0, 0.3)',
        };
      case 'awaited':
        return {
          icon: <Clock size={14} color="#A855F7" />,
          title: 'Under Review',
          textColor: '#A855F7',
          bgColor: isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.1)',
          borderColor: 'rgba(168, 85, 247, 0.25)',
        };
      case 'rejected':
        return {
          icon: <XCircle size={14} color="#EF4444" />,
          title: 'Rejected',
          textColor: '#EF4444',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.25)',
        };
      default:
        return {
          icon: <Clock size={14} color="#F59E0B" />,
          title: 'Pending',
          textColor: '#F59E0B',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Team constraints description
  const getTeamSizeDescription = () => {
    if (eventType === 'individual') {
      return '1 participant (Solo entry)';
    }

    const min = minTeamSize ?? null;
    const max = maxTeamSize ?? null;

    if (min && max) {
      if (min === max) {
        return `Exactly ${min} members required`;
      }
      return `${min} to ${max} members allowed`;
    }
    if (min) {
      return `Min. ${min} members required`;
    }
    if (max) {
      return `Up to ${max} members allowed`;
    }
    return 'Team event (Flexible size)';
  };

  let formattedDate = '';
  try {
    formattedDate = new Date(registeredAt).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    formattedDate = registeredAt;
  }

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* Header Row: Title & Status Pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 15,
            color: textPrimary,
            flexShrink: 1,
          }}
        >
          Registration Status
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: statusConfig.bgColor,
            borderColor: statusConfig.borderColor,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 16,
            flexShrink: 0,
          }}
        >
          {statusConfig.icon}
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 12,
              color: statusConfig.textColor,
              marginLeft: 5,
            }}
          >
            {statusConfig.title}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: dividerColor, marginBottom: 12 }} />

      {/* Constraints & Format Row */}
      <View style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          {eventType === 'team' ? (
            <Users size={13} color="#41B8F0" style={{ marginRight: 6 }} />
          ) : (
            <User size={13} color="#41B8F0" style={{ marginRight: 6 }} />
          )}
          <Text
            style={{
              fontFamily: 'Poppins_500Medium',
              fontSize: 11,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {eventType === 'team' ? 'Team Constraints' : 'Event Format'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 13,
              color: textPrimary,
              flexShrink: 1,
            }}
          >
            {eventType === 'team' ? 'Team Event' : 'Individual Entry'}
          </Text>
          <Text
            style={{
              fontFamily: 'Poppins_400Regular',
              fontSize: 13,
              color: textSecondary,
            }}
          >
            •
          </Text>
          <Text
            style={{
              fontFamily: 'Poppins_500Medium',
              fontSize: 13,
              color: '#41B8F0',
              flexShrink: 1,
            }}
          >
            {getTeamSizeDescription()}
          </Text>
        </View>

        {/* Current Team Members Count Badge (if team event) */}
        {eventType === 'team' && currentTeamSize != null && (
          <View
            style={{
              marginTop: 6,
              alignSelf: 'flex-start',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: cardBorder,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 11,
                color: textSecondary,
              }}
            >
              Current team: <Text style={{ color: textPrimary, fontFamily: 'Poppins_600SemiBold' }}>{currentTeamSize}</Text>{' '}
              {maxTeamSize ? `of ${maxTeamSize} max` : minTeamSize ? `(min. ${minTeamSize})` : 'members'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Info: Category & Registered Date */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: dividerColor,
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        {eventCategory ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            <Tag size={12} color={textSecondary} style={{ marginRight: 5 }} />
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 12,
                color: textSecondary,
              }}
              numberOfLines={1}
            >
              Category: <Text style={{ color: textPrimary, textTransform: 'capitalize' }}>{eventCategory}</Text>
            </Text>
          </View>
        ) : <View />}

        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
          <Calendar size={12} color={textSecondary} style={{ marginRight: 5 }} />
          <Text
            style={{
              fontFamily: 'Poppins_400Regular',
              fontSize: 12,
              color: textSecondary,
            }}
          >
            {formattedDate}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default RegistrationStatusCard;
