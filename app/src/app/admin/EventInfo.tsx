import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Image,
} from "react-native";
import {
  Edit,
  Save,
  X,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ImageIcon,
  Info,
  Settings,
  Award,
  UserPlus,
  Plus,
  Trash2,
  Upload,
} from "lucide-react-native";
import MarkdownText from "@/components/display/MarkdownText";
import { FirebaseEvent } from "@/types/models";
import {
  updateEventInfo,
  searchUsers,
  searchVenues,
  uploadFile,
} from "@/api/admin";
import { Input } from "@/components";
import { useUserStore } from "@/state/userStore";
import { useThemeStore } from "@/state/themeStore";
import { showAlert } from "@/components";

// Phase 3: Custom Field Types
interface BaseCustomField {
  fieldId: string;
  label: string;
  isRequired: boolean;
}

interface TextField extends BaseCustomField {
  type: "text";
  placeholder?: string;
}

interface LinkField extends BaseCustomField {
  type: "link";
  placeholder?: string;
}

interface NumberField extends BaseCustomField {
  type: "number";
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

interface SelectField extends BaseCustomField {
  type: "select";
  options: string[];
}

interface MultiSelectField extends BaseCustomField {
  type: "multi-select";
  options: string[];
}

type CustomField =
  | TextField
  | LinkField
  | NumberField
  | SelectField
  | MultiSelectField;

interface EventInfoProps {
  event: FirebaseEvent;
  onEventUpdate: (updatedEvent: FirebaseEvent) => void;
  navigation: any;
}

export default function EventInfo({
  event,
  onEventUpdate,
  navigation,
}: EventInfoProps) {
  const { isDark } = useThemeStore();
  const [isEditing, setIsEditing] = useState(false);
  const { userData: userProfile } = useUserStore();

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';
  const inputBg = isDark ? '#26262B' : '#F3F4F6';

  // Safety check for undefined event
  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#41B8F0" />
        <Text style={{ fontFamily: 'Poppins_500Medium', color: subTextColor, marginTop: 16 }}>Loading event information...</Text>
      </View>
    );
  }

  // Check if user can edit this event
  const canEdit = () => {
    if (!userProfile) return false;

    // Check if user is an event_admin
    if (userProfile.roles?.includes("event_admin") || userProfile.roles?.includes("admin")) return true;

    const isCoordinator = event.coordinators?.some(
      (coordinator) => coordinator.email === userProfile.email
    );

    return isCoordinator;
  };
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Phase 2: Advanced Features State
  const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [venueSearchTerm, setVenueSearchTerm] = useState("");
  const [venueResults, setVenueResults] = useState<any[]>([]);

  // Refs for search timeout
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEdit = () => {
    // Double-check permissions before allowing edit
    if (!canEdit()) {
      showAlert("Access Denied", "You don't have permission to edit this event");
      return;
    }

    setEditData({
      // Basic Information
      title: event.title || "",
      category: event.category || "Technical",
      shortDescription: event.shortDescription || "",
      description: event.description || "",
      coverImage: event.coverImage || "",
      eventType: event.eventType || "individual",
      isFeatured: event.isFeatured || false,
      externalUrl: (event as any).externalUrl || "",

      // Team-specific fields
      minTeamSize: event.minTeamSize || 2,
      maxTeamSize: event.maxTeamSize || 5,
      sameCollegeOnly: event.sameCollegeOnly || false,

      // Event Dates & Venue
      registrationDeadline: event.registrationDeadline || "",
      startDateTime: event.startDateTime || "",
      endDateTime: event.endDateTime || "",
      dateTime: event.dateTime || "",
      venueName: event.venueName || "",
      venueId: event.venueId || "",
      maxParticipants: (event as any).maxParticipants || "",

      // Event Settings
      isPublic: event.isPublic !== false,
      paymentRequired: event.paymentRequired || false,
      paymentStarted: event.paymentStarted || false,
      requireAdminApproval: (event as any).requireAdminApproval || false,
      paymentType: (event as any).paymentType || "fixed",

      // Payment fees
      registrationFee: {
        host: event.registrationFee?.host || 0,
        other: event.registrationFee?.other || 0,
      },

      // Prizes & Media
      prizes: event.prizes || "",
      shortPrizes: event.shortPrizes || "",
      rules: event.rules || "",

      // Arrays for media
      images: event.images || [],
      links: event.links || [],
      reelsId: event.reelsId || [],

      // Coordinators
      coordinators: event.coordinators || [],

      // Custom Fields
      customFields: (event as any).customFields || [],
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Check permissions before saving
    if (!canEdit()) {
      showAlert("Access Denied", "You don't have permission to edit this event");
      return;
    }

    // Validation
    if (!editData.title?.trim()) {
      showAlert("Error", "Event title is required");
      return;
    }

    if (!editData.category) {
      showAlert("Error", "Event category is required");
      return;
    }

    if (
      editData.eventType === "externalLink" &&
      !editData.externalUrl?.trim()
    ) {
      showAlert("Error", "External URL is required for external link events");
      return;
    }

    if (editData.coordinators?.length === 0) {
      showAlert("Error", "At least one coordinator is required");
      return;
    }

    // Validate custom fields
    const customFields = editData.customFields || [];
    for (let i = 0; i < customFields.length; i++) {
      const field = customFields[i];

      if (!field.label?.trim()) {
        showAlert("Error", `Custom field ${i + 1} must have a label`);
        return;
      }

      if (field.type === "select" || field.type === "multi-select") {
        const validOptions = field.options.filter((opt: string) => opt.trim());
        if (validOptions.length === 0) {
          showAlert(
            "Error",
            `Custom field "${field.label}" must have at least one option`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Clean up data before sending
      const cleanedData = {
        ...editData,
        // Remove empty strings from arrays
        images: (editData.images || []).filter((img: string) => img.trim()),
        links: (editData.links || []).filter((link: string) => link.trim()),
        reelsId: (editData.reelsId || []).filter((reel: string) => reel.trim()),
        // Ensure coordinators array is properly formatted
        coordinators: editData.coordinators || [],
        // Clean up custom fields
        customFields: (editData.customFields || []).map(
          (field: CustomField) => {
            // Clean up options for select fields
            if (field.type === "select" || field.type === "multi-select") {
              return {
                ...field,
                options: field.options.filter((opt: string) => opt.trim()),
              };
            }

            return field;
          }
        ),
      };

      const result = await updateEventInfo(event.eventId, cleanedData);

      if (result.success) {
        const updatedEvent = { ...event, ...cleanedData };
        onEventUpdate(updatedEvent);
        setIsEditing(false);
        setEditData({});
        showAlert("Success", "Event updated successfully!");
      } else {
        showAlert("Error", result.error || "Failed to update event");
      }
    } catch (error) {
      console.error("Save error:", error);
      showAlert("Error", "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return "Date not set";
    }
  };

  // Format date for display in input fields (DD/MM/YYYY HH:MM)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Parse DD/MM/YYYY HH:MM format back to ISO string
  const parseInputDate = (inputString: string) => {
    if (!inputString) return "";
    try {
      // If it's already in ISO format, return as is
      if (inputString.includes("T")) return inputString;

      // Parse DD/MM/YYYY HH:MM format
      const [datePart, timePart] = inputString.split(" ");
      if (!datePart || !timePart) return "";

      const [day, month, year] = datePart.split("/");
      const [hour, minute] = timePart.split(":");

      if (!day || !month || !year || !hour || !minute) return "";

      const date = new Date();
      date.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      date.setHours(parseInt(hour), parseInt(minute), 0, 0);

      return date.toISOString();
    } catch {
      return "";
    }
  };

  // Custom DateTimeInput component (text input only)
  const renderDateTimeInput = (
    label: string,
    field: string,
    value: string,
    required: boolean = false
  ) => (
    <View className="mb-4">
      <Input
        label={`${label}${required ? " *" : ""}`}
        value={value && value.includes("T") ? formatDateForInput(value) : value}
        onChangeText={(inputValue) => {
          // Store the raw input value directly to allow editing
          // Only convert to ISO when the input is complete and valid
          if (
            inputValue.length === 16 &&
            inputValue.includes("/") &&
            inputValue.includes(" ") &&
            inputValue.includes(":")
          ) {
            // Complete format: DD/MM/YYYY HH:MM
            const isoDate = parseInputDate(inputValue);
            if (isoDate) {
              setEditData({ ...editData, [field]: isoDate });
              return;
            }
          }
          // For incomplete input, store as-is to allow editing
          setEditData({ ...editData, [field]: inputValue });
        }}
        placeholder="DD/MM/YYYY HH:MM (IST)"
      />
    </View>
  );

  // Phase 2: Helper Functions for Advanced Features

  // Debounced search function for better performance
  const debouncedUserSearch = (term: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleUserSearch(term);
    }, 300); // 300ms delay
  };

  // Search users using real API
  const handleUserSearch = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const users = await searchUsers(term);
      setSearchResults(users);
    } catch (error) {
      console.error("User search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Search venues using real API
  const handleVenueSearch = async (term: string) => {
    if (!term || term.length < 2) {
      setVenueResults([]);
      return;
    }

    try {
      const venues = await searchVenues(term);
      setVenueResults(venues);
    } catch (error) {
      console.error("Venue search error:", error);
      setVenueResults([]);
    }
  };

  // Add coordinator
  const addCoordinator = (user: any) => {
    if (editData.coordinators.some((c: any) => c.userID === user.userId))
      return;

    setEditData({
      ...editData,
      coordinators: [
        ...editData.coordinators,
        {
          name: user.displayName,
          phone: user.phoneNumber,
          email: user.email,
          userID: user.userId,
        },
      ],
    });
    setSearchTerm("");
    setSearchResults([]);
  };

  // Remove coordinator
  const removeCoordinator = (index: number) => {
    const newCoordinators = [...editData.coordinators];
    newCoordinators.splice(index, 1);
    setEditData({ ...editData, coordinators: newCoordinators });
  };

  // Add array item (for images, links, reels)
  const addArrayItem = (arrayName: string) => {
    setEditData({
      ...editData,
      [arrayName]: [...(editData[arrayName] || []), ""],
    });
  };

  // Remove array item
  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = [...(editData[arrayName] || [])];
    newArray.splice(index, 1);
    setEditData({ ...editData, [arrayName]: newArray });
  };

  // Update array item
  const updateArrayItem = (arrayName: string, index: number, value: string) => {
    const newArray = [...(editData[arrayName] || [])];
    newArray[index] = value;
    setEditData({ ...editData, [arrayName]: newArray });
  };

  // Phase 3: Custom Field Management Functions

  const addCustomField = () => {
    const newField: TextField = {
      fieldId: Date.now().toString(),
      label: "",
      type: "text",
      isRequired: false,
      placeholder: "",
    };

    setEditData({
      ...editData,
      customFields: [...(editData.customFields || []), newField],
    });
  };

  const removeCustomField = (index: number) => {
    const newFields = [...(editData.customFields || [])];
    newFields.splice(index, 1);
    setEditData({ ...editData, customFields: newFields });
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const newFields = [...(editData.customFields || [])];
    newFields[index] = { ...newFields[index], ...updates };
    setEditData({ ...editData, customFields: newFields });
  };

  const changeCustomFieldType = (
    index: number,
    newType: CustomField["type"]
  ) => {
    const currentField = editData.customFields[index];
    let newField: CustomField;

    switch (newType) {
      case "text":
        newField = {
          fieldId: currentField.fieldId,
          label: currentField.label,
          isRequired: currentField.isRequired,
          type: "text",
          placeholder: "",
        };
        break;
      case "link":
        newField = {
          fieldId: currentField.fieldId,
          label: currentField.label,
          isRequired: currentField.isRequired,
          type: "link",
          placeholder: "",
        };
        break;
      case "number":
        newField = {
          fieldId: currentField.fieldId,
          label: currentField.label,
          isRequired: currentField.isRequired,
          type: "number",
          minValue: undefined,
          maxValue: undefined,
          placeholder: "",
        };
        break;
      case "select":
        newField = {
          fieldId: currentField.fieldId,
          label: currentField.label,
          isRequired: currentField.isRequired,
          type: "select",
          options: [""],
        };
        break;
      case "multi-select":
        newField = {
          fieldId: currentField.fieldId,
          label: currentField.label,
          isRequired: currentField.isRequired,
          type: "multi-select",
          options: [""],
        };
        break;
      default:
        newField = currentField;
    }

    const newFields = [...(editData.customFields || [])];
    newFields[index] = newField;
    setEditData({ ...editData, customFields: newFields });
  };

  const addFieldOption = (fieldIndex: number) => {
    const field = editData.customFields[fieldIndex];
    if (field.type === "select" || field.type === "multi-select") {
      const newOptions = [...field.options, ""];
      updateCustomField(fieldIndex, { options: newOptions });
    }
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const field = editData.customFields[fieldIndex];
    if (field.type === "select" || field.type === "multi-select") {
      const newOptions = [...field.options];
      newOptions.splice(optionIndex, 1);
      if (newOptions.length === 0) newOptions.push("");
      updateCustomField(fieldIndex, { options: newOptions });
    }
  };

  const updateFieldOption = (
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const field = editData.customFields[fieldIndex];
    if (field.type === "select" || field.type === "multi-select") {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateCustomField(fieldIndex, { options: newOptions });
    }
  };

  const renderViewMode = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Hero Image */}
      <View style={{ marginBottom: 16 }}>
        {event.coverImage ? (
          <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}>
            <Image
              source={{
                uri: event.coverImage,
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={() => {}}
            />
          </View>
        ) : (
          <View style={{ height: 160, borderRadius: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={44} color={subTextColor} />
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13, marginTop: 8 }}>
              No cover image uploaded
            </Text>
          </View>
        )}
      </View>

      {/* Header Section */}
      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: "Talina", color: textColor, fontSize: 24, marginBottom: 6 }}>
              {event.title}
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 14, lineHeight: 22 }}>
              {event.shortDescription}
            </Text>
          </View>
          {canEdit() && (
            <TouchableOpacity
              style={{ backgroundColor: '#41B8F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <Edit size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', marginLeft: 6, fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Badges */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {event.isFeatured && (
            <View style={{ backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#22c55e", fontSize: 12 }}>
                Featured
              </Text>
            </View>
          )}
          {event.paymentRequired && (
            <View style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#f59e0b", fontSize: 12 }}>
                Paid Event
              </Text>
            </View>
          )}
          {!event.isPublic && (
            <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#ef4444", fontSize: 12 }}>
                Private
              </Text>
            </View>
          )}
          <View style={{ backgroundColor: isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 12, textTransform: 'capitalize' }}>
              {event.category}
            </Text>
          </View>
        </View>
      </View>

      {/* Event Details */}
      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 17, marginBottom: 16 }}>
          Event Details
        </Text>

        {/* Date & Time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Calendar size={18} color="#41B8F0" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 14 }}>Event Date</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>
              {formatDate(event.dateTime || event.startDateTime)}
            </Text>
          </View>
        </View>

        {/* Venue */}
        {event.venueName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <MapPin size={18} color="#41B8F0" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 14 }}>Venue</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>{event.venueName}</Text>
            </View>
          </View>
        )}

        {/* Event Type */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Users size={18} color="#41B8F0" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 14 }}>Event Type</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12, textTransform: 'capitalize' }}>
              {event.eventType}
              {event.eventType === "team" &&
                event.maxTeamSize &&
                ` (Max ${event.maxTeamSize} members)`}
            </Text>
          </View>
        </View>

        {/* Registration Fee */}
        {event.paymentRequired && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DollarSign size={18} color="#41B8F0" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 14 }}>Registration Fee</Text>
              <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>
                Host: ₹{event.registrationFee?.host || 0} • Other: ₹
                {event.registrationFee?.other || 0}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 17, marginBottom: 12 }}>
          Description
        </Text>
        <MarkdownText
          lightMode={!isDark}
          style={{ fontSize: 14, lineHeight: 22, fontFamily: "Poppins_400Regular", color: textColor }}
        >
          {event.description}
        </MarkdownText>
      </View>

      {/* Rules */}
      {event.rules && (
        <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 17, marginBottom: 12 }}>Rules</Text>
          <MarkdownText
            lightMode={!isDark}
            style={{ fontSize: 14, lineHeight: 22, fontFamily: "Poppins_400Regular", color: textColor }}
          >
            {event.rules}
          </MarkdownText>
        </View>
      )}

      {/* Prizes */}
      {event.prizes && (
        <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 17, marginBottom: 12 }}>Prizes</Text>
          <MarkdownText
            lightMode={!isDark}
            style={{ fontSize: 14, lineHeight: 22, fontFamily: "Poppins_400Regular", color: textColor }}
          >
            {event.prizes}
          </MarkdownText>
        </View>
      )}
    </ScrollView>
  );

  const categories = [
    "Technical",
    "Cultural",
    "Workshop",
    "Business",
    "Informal",
  ];

  const renderCategorySelector = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 14, marginBottom: 10 }}>
        Category *
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {categories.map((cat) => {
            const isSelected = editData.category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#41B8F0' : cardBorder,
                  backgroundColor: isSelected ? (isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE') : cardBg,
                }}
                onPress={() => setEditData({ ...editData, category: cat })}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? "Poppins_600SemiBold" : "Poppins_500Medium",
                    fontSize: 13,
                    color: isSelected ? '#41B8F0' : subTextColor,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const renderEventTypeSelector = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 14, marginBottom: 10 }}>
        Event Type *
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {["individual", "team", "externalLink"].map((type) => {
          const isSelected = editData.eventType === type;
          return (
            <TouchableOpacity
              key={type}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: isSelected ? '#41B8F0' : cardBorder,
                backgroundColor: isSelected ? (isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE') : cardBg,
                alignItems: 'center',
              }}
              onPress={() => {
                const updates: any = { eventType: type };
                if (type === "individual") {
                  updates.minTeamSize = undefined;
                  updates.maxTeamSize = updates.sameCollegeOnly = undefined;
                  updates.externalUrl = "";
                } else if (type === "externalLink") {
                  updates.minTeamSize = undefined;
                  updates.maxTeamSize = undefined;
                  updates.sameCollegeOnly = undefined;
                  updates.venueName = "";
                  updates.venueId = "";
                  updates.maxParticipants = "";
                } else if (type === "team") {
                  updates.externalUrl = "";
                  if (!editData.minTeamSize) updates.minTeamSize = 2;
                  if (!editData.maxTeamSize) updates.maxTeamSize = 5;
                }
                setEditData({ ...editData, ...updates });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: isSelected ? "Poppins_600SemiBold" : "Poppins_500Medium",
                  fontSize: 12,
                  color: isSelected ? '#41B8F0' : subTextColor,
                }}
              >
                {type === "externalLink"
                  ? "External"
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSwitchField = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <View style={{ flex: 1, marginRight: 14 }}>
        <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 14 }}>{label}</Text>
        {description && (
          <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12, marginTop: 2 }}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isDark ? '#323238' : '#D1D5DB', true: '#41B8F0' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const renderSection = (
    title: string,
    children: React.ReactNode,
    icon?: React.ReactNode
  ) => (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        {icon}
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 16, marginLeft: 8 }}>{title}</Text>
      </View>
      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: cardBorder }}>
        {children}
      </View>
    </View>
  );

  // Phase 2: Dynamic Array Rendering Components

  const renderImageArray = (
    label: string,
    arrayName: string,
    isReel = false
  ) => (
    <View className="mb-4">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15, marginBottom: 8 }}>{label}</Text>
      {(editData[arrayName] || []).map((item: string, index: number) => (
        <View key={index} className="flex-row items-center mb-3">
          <View className="flex-1 mr-3">
            <Input
              value={item}
              onChangeText={(value) => updateArrayItem(arrayName, index, value)}
              placeholder={isReel ? "Reel ID or upload" : "Image URL or upload"}
            />
          </View>
          <TouchableOpacity
            style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
            className="p-3 rounded-xl mr-2"
            onPress={() => {
              showAlert("Upload", "File upload would be implemented here");
            }}
            disabled={uploadingImageIdx === index}
          >
            {uploadingImageIdx === index ? (
              <ActivityIndicator size="small" color="#41B8F0" />
            ) : (
              <Upload size={16} color="#41B8F0" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500/40 p-3 rounded-xl"
            onPress={() => removeArrayItem(arrayName, index)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={{ borderColor: "#41B8F0", borderWidth: 1.5, backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "rgba(65, 184, 240, 0.08)" }}
        className="px-4 py-3 rounded-xl flex-row items-center justify-center"
        onPress={() => addArrayItem(arrayName)}
      >
        <Plus size={16} color="#41B8F0" />
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", marginLeft: 8 }}>
          Add {isReel ? "Reel" : "Image"}
        </Text>
      </TouchableOpacity>
      {uploadError && (
        <Text style={{ fontFamily: "Poppins_400Regular" }} className="text-red-400 text-sm mt-2">{uploadError}</Text>
      )}
    </View>
  );

  const renderLinkArray = () => (
    <View className="mb-4">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15, marginBottom: 8 }}>Links</Text>
      {(editData.links || []).map((link: string, index: number) => (
        <View key={index} className="flex-row items-center mb-3">
          <View className="flex-1 mr-3">
            <Input
              value={link}
              onChangeText={(value) => updateArrayItem("links", index, value)}
              placeholder="Link URL"
            />
          </View>
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500/40 p-3 rounded-xl"
            onPress={() => removeArrayItem("links", index)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={{ borderColor: "#41B8F0", borderWidth: 1.5, backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "rgba(65, 184, 240, 0.08)" }}
        className="px-4 py-3 rounded-xl flex-row items-center justify-center"
        onPress={() => addArrayItem("links")}
      >
        <Plus size={16} color="#41B8F0" />
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", marginLeft: 8 }}>Add Link</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCoordinatorSearch = () => (
    <View className="mb-4">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15, marginBottom: 8 }}>
        Coordinators
      </Text>

      {/* Current coordinators */}
      {(editData.coordinators || []).map((coordinator: any, index: number) => (
        <View
          key={index}
          style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
          className="rounded-xl p-4 mb-3 flex-row items-center"
        >
          <View className="w-10 h-10 bg-[#41B8F0] rounded-full items-center justify-center mr-3">
            <Text className="text-white font-bold">
              {coordinator.name?.charAt(0) || "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor }}>{coordinator.name}</Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13 }}>{coordinator.email}</Text>
            {coordinator.phone && (
              <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>{coordinator.phone}</Text>
            )}
          </View>
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500/40 p-2 rounded-lg"
            onPress={() => removeCoordinator(index)}
            disabled={editData.coordinators?.length <= 1}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Search for new coordinators */}
      <View className="mb-3">
        <Input
          value={searchTerm}
          onChangeText={(value) => {
            setSearchTerm(value);
            debouncedUserSearch(value);
          }}
          placeholder="Search user by name, email, college, or phone..."
        />
      </View>

      {searching && (
        <View className="flex-row items-center mb-3">
          <ActivityIndicator size="small" color="#41B8F0" />
          <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, marginLeft: 8 }}>Searching users...</Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <View className="mb-3">
          <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13, marginBottom: 8 }}>
            Found {searchResults.length} user
            {searchResults.length !== 1 ? "s" : ""} matching "{searchTerm}"
          </Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {searchResults.map((user) => (
              <TouchableOpacity
                key={user.userId}
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="rounded-xl p-3 mb-2 flex-row items-center"
                onPress={() => addCoordinator(user)}
              >
                <View className="w-8 h-8 bg-[#41B8F0] rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold text-xs">
                    {user.displayName?.charAt(0) || "?"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor }}>
                    {user.displayName}
                  </Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>{user.email}</Text>
                </View>
                <View className="bg-[#41B8F0]/20 border border-[#41B8F0]/30 px-2 py-1 rounded">
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 11 }}>
                    {user.collegeName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderVenueSearch = () => (
    <View className="mb-4">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15, marginBottom: 8 }}>Venue</Text>
      <Input
        value={venueSearchTerm || editData.venueName || ""}
        onChangeText={(value) => {
          setVenueSearchTerm(value);
          setEditData({
            ...editData,
            venueName: value,
          });

          if (value.length > 2) {
            handleVenueSearch(value);
          } else {
            setVenueResults([]);
          }
        }}
        placeholder="Search for venue..."
      />

      {venueResults.length > 0 && (
        <View className="mt-2">
          <ScrollView style={{ maxHeight: 150 }}>
            {venueResults.map((venue) => (
              <TouchableOpacity
                key={venue.venueId}
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="rounded-xl p-3 mb-2"
                onPress={() => {
                  setEditData({
                    ...editData,
                    venueName: venue.venueName,
                    venueId: venue.venueId,
                  });
                  setVenueSearchTerm(venue.venueName);
                  setVenueResults([]);
                }}
              >
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor }}>
                  {venue.venueName}
                </Text>
                <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}>
                  ID: {venue.venueId}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // Phase 3: Custom Field Rendering Components

  const renderFieldTypeSelector = (
    fieldIndex: number,
    currentType: CustomField["type"]
  ) => (
    <View className="mb-3">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 13, marginBottom: 6 }}>Field Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {(["text", "number", "link", "select", "multi-select"] as const).map(
            (type) => (
              <TouchableOpacity
                key={type}
                style={{
                  backgroundColor: currentType === type ? "#41B8F0" : cardBg,
                  borderColor: currentType === type ? "#41B8F0" : cardBorder,
                  borderWidth: 1,
                }}
                className="px-3 py-2 rounded-lg"
                onPress={() => changeCustomFieldType(fieldIndex, type)}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: currentType === type ? "#FFFFFF" : subTextColor,
                    fontSize: 12,
                  }}
                >
                  {type === "multi-select"
                    ? "Multi-Select"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderCustomFieldOptions = (field: CustomField, fieldIndex: number) => {
    if (field.type !== "select" && field.type !== "multi-select") return null;

    return (
      <View className="mb-3">
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 13, marginBottom: 6 }}>Options</Text>
        {field.options.map((option, optionIndex) => (
          <View key={optionIndex} className="flex-row items-center mb-2">
            <View className="flex-1 mr-2">
              <Input
                value={option}
                onChangeText={(value) =>
                  updateFieldOption(fieldIndex, optionIndex, value)
                }
                placeholder="Option"
              />
            </View>
            <TouchableOpacity
              className="bg-red-500/20 border border-red-500/40 p-3 rounded-lg"
              onPress={() => removeFieldOption(fieldIndex, optionIndex)}
              disabled={field.options.length <= 1}
            >
              <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={{ borderColor: "#41B8F0", borderWidth: 1.5, backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "rgba(65, 184, 240, 0.08)" }}
          className="px-3 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => addFieldOption(fieldIndex)}
        >
          <Plus size={14} color="#41B8F0" />
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", marginLeft: 6, fontSize: 13 }}>
            Add Option
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomFieldTypeSpecificFields = (
    field: CustomField,
    fieldIndex: number
  ) => {
    switch (field.type) {
      case "text":
      case "link":
        return (
          <Input
            label="Placeholder"
            value={field.placeholder || ""}
            onChangeText={(value) =>
              updateCustomField(fieldIndex, { placeholder: value })
            }
            placeholder="Placeholder text"
            className="mb-3"
          />
        );

      case "number":
        return (
          <View className="mb-3">
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Input
                  label="Min Value"
                  value={field.minValue?.toString() || ""}
                  onChangeText={(value) =>
                    updateCustomField(fieldIndex, {
                      minValue: value ? Number(value) : undefined,
                    })
                  }
                  placeholder="Min"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Max Value"
                  value={field.maxValue?.toString() || ""}
                  onChangeText={(value) =>
                    updateCustomField(fieldIndex, {
                      maxValue: value ? Number(value) : undefined,
                    })
                  }
                  placeholder="Max"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Input
              label="Placeholder"
              value={field.placeholder || ""}
              onChangeText={(value) =>
                updateCustomField(fieldIndex, { placeholder: value })
              }
              placeholder="Placeholder text"
            />
          </View>
        );

      case "select":
      case "multi-select":
        return renderCustomFieldOptions(field, fieldIndex);

      default:
        return null;
    }
  };

  const renderCustomFields = () => (
    <View className="mb-4">
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15, marginBottom: 8 }}>
        Custom Registration Fields
      </Text>

      {(editData.customFields || []).map(
        (field: CustomField, index: number) => (
          <View
            key={field.fieldId}
            style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
            className="rounded-xl p-4 mb-4"
          >
            {/* Field Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor }}>
                Field {index + 1}
              </Text>
              <TouchableOpacity
                className="bg-red-500/20 border border-red-500/40 p-2 rounded-lg"
                onPress={() => removeCustomField(index)}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Field Label */}
            <Input
              label="Field Label"
              value={field.label}
              onChangeText={(value) =>
                updateCustomField(index, { label: value })
              }
              placeholder="Field Label"
              className="mb-3"
            />

            {/* Field Type Selector */}
            {renderFieldTypeSelector(index, field.type)}

            {/* Required Toggle */}
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontFamily: "Poppins_500Medium", color: textColor, fontSize: 13 }}>
                Required Field
              </Text>
              <Switch
                value={field.isRequired}
                onValueChange={(value) =>
                  updateCustomField(index, { isRequired: value })
                }
                trackColor={{ false: isDark ? "#2C2C2E" : "#E5E7EB", true: "#41B8F0" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Type-specific fields */}
            {renderCustomFieldTypeSpecificFields(field, index)}
          </View>
        )
      )}

      {/* Add Custom Field Button */}
      <TouchableOpacity
        style={{ borderColor: "#41B8F0", borderWidth: 1.5, backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "rgba(65, 184, 240, 0.08)" }}
        className="px-4 py-3 rounded-xl flex-row items-center justify-center"
        onPress={addCustomField}
      >
        <Plus size={16} color="#41B8F0" />
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", marginLeft: 8 }}>Add Custom Field</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEditMode = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Basic Information */}
      {renderSection(
        "Basic Information",
        <>
          <Input
            label="Event Title *"
            value={editData.title || ""}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
            placeholder="e.g. Hackathon 2025"
            className="mb-4"
          />

          {renderCategorySelector()}

          <Input
            label="Short Description"
            value={editData.shortDescription || ""}
            onChangeText={(value) =>
              setEditData({ ...editData, shortDescription: value })
            }
            placeholder="A one-line summary for quick reference"
            className="mb-4"
          />

          <Input
            label="Full Description"
            value={editData.description || ""}
            onChangeText={(value) =>
              setEditData({ ...editData, description: value })
            }
            placeholder="Describe the event, rules, and what to expect. Supports Markdown formatting."
            multiline
            numberOfLines={6}
            className="mb-4"
          />

          <Input
            label="Cover Image URL"
            value={editData.coverImage || ""}
            onChangeText={(value) =>
              setEditData({ ...editData, coverImage: value })
            }
            placeholder="https://... (Recommended: 16:9 aspect ratio, high quality)"
            className="mb-4"
          />

          {/* Image Preview */}
          {editData.coverImage && (
            <View className="mb-4">
              <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13, marginBottom: 8 }}>Image Preview:</Text>
              <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }} className="h-32 rounded-xl overflow-hidden">
                <Image
                  source={{ uri: editData.coverImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={() => {
                    // Handle image load error silently
                  }}
                />
              </View>
            </View>
          )}

          {renderEventTypeSelector()}

          {/* External URL field for external link events */}
          {editData.eventType === "externalLink" && (
            <Input
              label="External URL *"
              value={editData.externalUrl || ""}
              onChangeText={(value) =>
                setEditData({ ...editData, externalUrl: value })
              }
              placeholder="https://..."
              className="mb-4"
            />
          )}

          {/* Team-specific fields */}
          {editData.eventType === "team" && (
            <>
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Input
                    label="Min Team Size *"
                    value={editData.minTeamSize?.toString() || ""}
                    onChangeText={(value) => {
                      if (value === "" || /^\d+$/.test(value)) {
                        setEditData({
                          ...editData,
                          minTeamSize:
                            value === "" ? "" : parseInt(value) || "",
                        });
                      }
                    }}
                    placeholder="e.g. 2"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Max Team Size *"
                    value={editData.maxTeamSize?.toString() || ""}
                    onChangeText={(value) => {
                      if (value === "" || /^\d+$/.test(value)) {
                        setEditData({
                          ...editData,
                          maxTeamSize:
                            value === "" ? "" : parseInt(value) || "",
                        });
                      }
                    }}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {renderSwitchField(
                "Same College Only",
                editData.sameCollegeOnly || false,
                (value) => setEditData({ ...editData, sameCollegeOnly: value }),
                "Restrict team members to same college"
              )}
            </>
          )}

          {renderSwitchField(
            "Featured Event",
            editData.isFeatured || false,
            (value) => setEditData({ ...editData, isFeatured: value }),
            "Display this event prominently on the homepage"
          )}
        </>,
        <Info size={20} color="#41B8F0" />
      )}

      {/* Event Dates & Venue */}
      {renderSection(
        "Event Dates & Venue",
        <>
          {renderDateTimeInput(
            "Registration Deadline",
            "registrationDeadline",
            editData.registrationDeadline || "",
            true
          )}

          {renderDateTimeInput(
            "Start Date & Time",
            "startDateTime",
            editData.startDateTime || "",
            true
          )}

          {renderDateTimeInput(
            "End Date & Time",
            "endDateTime",
            editData.endDateTime || "",
            true
          )}

          {renderDateTimeInput(
            "Event Date & Time",
            "dateTime",
            editData.dateTime || "",
            true
          )}

          {/* Venue and max participants only for non-external events */}
          {editData.eventType !== "externalLink" && (
            <>
              {renderVenueSearch()}

              <Input
                label="Max Participants"
                value={editData.maxParticipants?.toString() || ""}
                onChangeText={(value) => {
                  if (value === "" || /^\d+$/.test(value)) {
                    setEditData({
                      ...editData,
                      maxParticipants:
                        value === "" ? undefined : parseInt(value) || undefined,
                    });
                  }
                }}
                placeholder="Leave empty for unlimited"
                keyboardType="numeric"
              />
            </>
          )}
        </>,
        <Calendar size={20} color="#41B8F0" />
      )}

      {/* Event Settings */}
      {renderSection(
        "Event Settings",
        <>
          {renderSwitchField(
            "Public Event",
            editData.isPublic !== false,
            (value) => setEditData({ ...editData, isPublic: value }),
            "Make event visible to public"
          )}

          {renderSwitchField(
            "Payment Required",
            editData.paymentRequired || false,
            (value) =>
              setEditData({
                ...editData,
                paymentRequired: value,
                paymentStarted: false,
              }),
            "Enable registration fees"
          )}

          {renderSwitchField(
            "Require Admin Approval",
            editData.requireAdminApproval || false,
            (value) =>
              setEditData({ ...editData, requireAdminApproval: value }),
            "Registrations need admin approval"
          )}

          {/* Payment Type selector for team events */}
          {editData.eventType === "team" && (
            <View className="mb-4">
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 14, marginBottom: 8 }}>
                Payment Type
              </Text>
              <View className="flex-row gap-3">
                {["fixed", "perHead"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      backgroundColor: editData.paymentType === type ? "#41B8F0" : cardBg,
                      borderColor: editData.paymentType === type ? "#41B8F0" : cardBorder,
                      borderWidth: 1,
                    }}
                    className="flex-1 px-4 py-3 rounded-xl"
                    onPress={() =>
                      setEditData({ ...editData, paymentType: type })
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: editData.paymentType === type ? "#FFFFFF" : subTextColor,
                        textAlign: "center",
                        textTransform: "capitalize",
                      }}
                    >
                      {type === "perHead" ? "Per Head" : "Fixed"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12, marginTop: 8 }}>
                Choose how registration fees are charged for teams
              </Text>
            </View>
          )}

          {/* Payment fields only show when payment is required */}
          {editData.paymentRequired && (
            <>
              {renderSwitchField(
                "Payment Started",
                editData.paymentStarted || false,
                (value) => setEditData({ ...editData, paymentStarted: value }),
                "Allow users to make payments"
              )}

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Input
                    label="Host Fee (₹)"
                    value={editData.registrationFee?.host?.toString() || ""}
                    onChangeText={(value) => {
                      if (value === "" || /^\d+$/.test(value)) {
                        setEditData({
                          ...editData,
                          registrationFee: {
                            ...editData.registrationFee,
                            host: value === "" ? 0 : parseInt(value) || 0,
                          },
                        });
                      }
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Other Fee (₹)"
                    value={editData.registrationFee?.other?.toString() || ""}
                    onChangeText={(value) => {
                      if (value === "" || /^\d+$/.test(value)) {
                        setEditData({
                          ...editData,
                          registrationFee: {
                            ...editData.registrationFee,
                            other: value === "" ? 0 : parseInt(value) || 0,
                          },
                        });
                      }
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </>
          )}
        </>,
        <Settings size={20} color="#41B8F0" />
      )}

      {/* Prizes & Media */}
      {renderSection(
        "Prizes & Media",
        <>
          <Input
            label="Prizes"
            value={editData.prizes || ""}
            onChangeText={(value) =>
              setEditData({ ...editData, prizes: value })
            }
            placeholder="e.g. ₹10,000 Cash Prize, Goodies, Certificates. Supports Markdown."
            multiline
            numberOfLines={4}
            className="mb-4"
          />

          <Input
            label="Short Prizes"
            value={editData.shortPrizes || ""}
            onChangeText={(value) =>
              setEditData({ ...editData, shortPrizes: value })
            }
            placeholder="e.g. Cash, Goodies, Certificates"
            className="mb-4"
          />

          <Input
            label="Rules & Guidelines"
            value={editData.rules || ""}
            onChangeText={(value) => setEditData({ ...editData, rules: value })}
            placeholder="List the rules and guidelines for the event. Supports Markdown formatting."
            multiline
            numberOfLines={6}
            className="mb-4"
          />

          {/* Dynamic Arrays for Media */}
          {renderImageArray("Additional Images", "images")}
          {renderLinkArray()}
          {renderImageArray("Reels", "reelsId", true)}
        </>,
        <Award size={20} color="#41B8F0" />
      )}

      {/* Coordinators */}
      {renderSection(
        "Coordinators",
        <>
          {renderCoordinatorSearch()}
          <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13 }}>
            At least one coordinator is required. Search by name or email to add
            coordinators.
          </Text>
        </>,
        <UserPlus size={20} color="#41B8F0" />
      )}

      {/* Custom Registration Fields */}
      {renderSection(
        "Custom Registration Fields",
        <>{renderCustomFields()}</>,
        <Info size={20} color="#41B8F0" />
      )}

      {/* Action Buttons */}
      <View
        style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
        className="rounded-2xl p-5 mb-6 shadow-sm"
      >
        <View className="flex-row gap-3">
          <TouchableOpacity
            style={{ backgroundColor: "#41B8F0", opacity: saving ? 0.7 : 1 }}
            className="flex-1 py-4 rounded-xl flex-row items-center justify-center shadow-sm"
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>Saving...</Text>
              </>
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: isDark ? "#2A2A30" : "#E5E7EB" }}
            className="flex-1 py-4 rounded-xl flex-row items-center justify-center"
            onPress={handleCancel}
            disabled={saving}
            activeOpacity={0.7}
          >
            <X size={18} color={textColor} />
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, marginLeft: 8 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-transparent p-6">
      {isEditing ? renderEditMode() : renderViewMode()}
    </View>
  );
}
