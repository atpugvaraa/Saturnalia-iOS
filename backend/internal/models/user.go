package models

import (
	"strings"

	"backend/internal/email"
	"backend/internal/isotime"
)

// Roles are additive permissions. Every account carries RoleUser; an
// administrator carries RoleAdmin alongside it, so a check is a membership test
// rather than an equality test.
const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

type User struct {
	UserID              string   `json:"userId"              firestore:"userId"`
	Email               string   `json:"email"               firestore:"email"`
	DisplayName         string   `json:"displayName"         firestore:"displayName"`
	PhoneNumber         string   `json:"phoneNumber"         firestore:"phoneNumber"`
	RollNumber          string   `json:"rollNumber"          firestore:"rollNumber"`
	CollegeName         string   `json:"collegeName"         firestore:"collegeName"`
	Roles               []string `json:"roles"               firestore:"roles"`
	Gender              string   `json:"gender"              firestore:"gender"`
	Age                 string   `json:"age"                 firestore:"age"`
	GraduationYear      string   `json:"graduationYear"      firestore:"graduationYear"`
	Interests           []string `json:"interests"           firestore:"interests"`
	FullyRegistered     bool     `json:"fullyRegistered"     firestore:"fullyRegistered"`
	IsVerified          bool     `json:"isVerified"          firestore:"isVerified"`
	IsAmbassador        bool     `json:"isAmbassador"        firestore:"isAmbassador"`
	AccommodationNeeded         bool            `json:"accommodationNeeded"         firestore:"accommodationNeeded"`
	Accommodation               map[string]bool `json:"accommodation"               firestore:"accommodation"`
	Food                        map[string]bool `json:"food"                        firestore:"food"`
	AccommodationTransactionIds []string        `json:"accommodationTransactionIds" firestore:"accommodationTransactionIds"`
	CheckInStatus               CheckInStatus   `json:"checkInStatus"               firestore:"checkInStatus"`
	ReferralCode                string          `json:"referralCode"                firestore:"referralCode"`
	ReferredBy                  string          `json:"referredBy"                  firestore:"referredBy"`
	Coins                       int             `json:"coins"                       firestore:"coins"`
	CreatedAt                   string          `json:"createdAt"                   firestore:"createdAt"`
	UpdatedAt                   string          `json:"updatedAt"                   firestore:"updatedAt"`
	FCMToken                    string          `json:"fcmToken"                    firestore:"fcmToken"`

	// IsHostCollegeStudent is derived from the verified email domain on every
	// load, never stored. A stored copy could disagree with the token that is
	// actually presenting the request, and this value decides both pricing and
	// the sameCollegeOnly gate.
	IsHostCollegeStudent bool `json:"isHostCollegeStudent" firestore:"-"`
}

type CheckInStatus struct {
	Fest          bool   `json:"fest"                    firestore:"fest"`
	Remark        string `json:"remark,omitempty"        firestore:"remark"`
	Accommodation bool   `json:"accommodation"           firestore:"accommodation"`
	Hostel        string `json:"Hostel,omitempty"        firestore:"Hostel"`
}

// NewUser is the document written at first sign-in. Everything else the profile
// needs arrives later through PATCH /me.
func NewUser(uid, address, displayName, referralCode string) *User {
	now := isotime.Now()
	return &User{
		UserID:       uid,
		Email:        address,
		DisplayName:  displayName,
		Roles:        []string{RoleUser},
		Interests:    []string{},
		ReferralCode: referralCode,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func (u *User) IsAdmin() bool {
	if u == nil {
		return false
	}
	for _, r := range u.Roles {
		rLower := strings.ToLower(strings.TrimSpace(r))
		switch rLower {
		case RoleAdmin, "super_admin", "superadmin", "dev", "event_admin",
			"event_coordinator", "hospitality_admin", "hospitality_member",
			"outreach_admin", "outreach_member", "executive_committee",
			"core_member", "finance", "media", "eb_member":
			return true
		}
	}
	return false
}

func (u *User) HasRole(role string) bool {
	if u == nil {
		return false
	}
	target := strings.ToLower(strings.TrimSpace(role))
	for _, r := range u.Roles {
		if strings.ToLower(strings.TrimSpace(r)) == target {
			return true
		}
	}
	return false
}

// PublicProfile is what one participant may see of another: enough to render a
// team roster and nothing more. Avatars are generated client-side from the
// userId, so no photo URL is carried here or stored anywhere.
type PublicProfile struct {
	UserID               string `json:"userId"`
	DisplayName          string `json:"displayName"`
	CollegeName          string `json:"collegeName"`
	IsHostCollegeStudent bool   `json:"isHostCollegeStudent"`
}

func (u *User) Public() PublicProfile {
	return PublicProfile{
		UserID:               u.UserID,
		DisplayName:          u.DisplayName,
		CollegeName:          u.CollegeName,
		IsHostCollegeStudent: u.IsHostCollegeStudent,
	}
}

// ResolveHostStatus derives the host-vs-external split from the verified email
// address. It is deliberately a method rather than a stored field: this value
// decides pricing and the sameCollegeOnly gate, and a stored copy could
// disagree with the token actually presenting the request.
//
// Every path that loads a user calls this before the user is used or returned.
func (u *User) ResolveHostStatus(hostDomain string) *User {
	if u != nil {
		u.IsHostCollegeStudent = email.HasDomain(u.Email, hostDomain)
	}
	return u
}
