package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/config"
	"backend/internal/fb"
	"backend/internal/middleware"
	"backend/internal/store"
)

// Router wires every route. Three auth postures are used:
//
//   - open: no token needed, but one is read if supplied so the response can
//     carry per-user pricing and registration state
//   - authed: a valid token plus an existing user document
//   - registered: the above plus a completed profile, required to register
func Router(cfg *config.Config, clients *fb.Clients, s *store.Store, cache *store.EventCache, api *API) *gin.Engine {
	r := gin.New()
	r.Use(middleware.WithRequestID(), middleware.Recovery(), gin.Logger(), middleware.CORS(cfg.AllowedOrigins))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.Static("/static", "../app/assets")

	optional := middleware.Auth(clients, s, cfg.HostEmailDomain, false)
	required := middleware.Auth(clients, s, cfg.HostEmailDomain, true)

	v1 := r.Group("/api/v1")

	// Session bootstrap needs a token but not an existing user document, since
	// creating that document is the point.
	v1.POST("/auth/session", required, api.PostSession)

	authed := v1.Group("", required, middleware.RequireUser())
	registered := v1.Group("", required, middleware.RequireUser(), middleware.RequireFullyRegistered())
	admin := v1.Group("", required, middleware.RequireUser(), middleware.RequireAdmin())

	authed.GET("/me", api.GetMe)
	authed.PATCH("/me", api.PatchMe)
	authed.GET("/me/events", api.GetMyEvents)

	// Public browsing. The optional token is what lets a signed-in caller see
	// their own fee and registration without a second request.
	open := v1.Group("", optional)
	open.GET("/events", api.ListEvents)
	open.GET("/events/categories", api.GetCategories)
	open.GET("/events/:id", api.GetEvent)
	open.GET("/faqs", api.ListFaqs)
	open.GET("/venues", api.ListVenues)
	open.GET("/banners", api.ListBanners)
	open.GET("/banners/:id", api.GetBanner)
	open.GET("/reels", api.ListReels)
	open.GET("/reels/:id", api.GetReel)
	open.GET("/stories", api.ListStories)
	open.GET("/stories/:id", api.GetStory)
	open.GET("/store", api.ListStoreItems)
	open.GET("/store/:id", api.GetStoreItem)
	open.POST("/chatbot/ask", api.Chat)

	// App status, links, maintenance, versions
	open.GET("/app/status", api.GetAppConfig)
	open.GET("/app/links", api.GetAppLinks)
	open.GET("/app/maintenance", api.GetAppMaintenance)
	open.GET("/app/versions", api.GetAppVersions)
	open.GET("/app/accommodation", api.GetAppAccommodation)

	registered.POST("/events/:id/register", api.Register)
	authed.DELETE("/events/:id/register", api.Unregister)
	authed.GET("/registrations/:id", api.GetRegistration)

	registered.POST("/events/:id/teams", api.CreateTeam)
	registered.POST("/teams/join", api.JoinTeam)
	authed.GET("/teams/:teamRef", api.GetTeam)
	authed.PATCH("/teams/:teamRef", api.RenameTeam)
	authed.DELETE("/teams/:teamRef", api.DeleteTeam)
	authed.POST("/teams/:teamRef/leave", api.LeaveTeam)
	authed.POST("/teams/:teamRef/transfer-leader", api.TransferLeader)
	authed.DELETE("/teams/:teamRef/members/:userId", api.RemoveMember)
	authed.POST("/teams/:teamRef/confirm", api.ConfirmTeam)

	admin.POST("/admin/events", api.CreateEvent)
	admin.PATCH("/admin/events/:id", api.UpdateEvent)
	admin.DELETE("/admin/events/:id", api.DeleteEvent)
	admin.GET("/admin/events/:id/registrations", api.ListEventRegistrations)

	admin.GET("/admin/payments", api.AdminListPayments)
	admin.PATCH("/admin/payments/:id", api.AdminUpdatePaymentStatus)

	admin.POST("/admin/faqs", api.CreateFaq)
	admin.PATCH("/admin/faqs/:id", api.UpdateFaq)
	admin.DELETE("/admin/faqs/:id", api.DeleteFaq)

	admin.POST("/admin/venues", api.CreateVenue)
	admin.PATCH("/admin/venues/:id", api.UpdateVenue)
	admin.DELETE("/admin/venues/:id", api.DeleteVenue)

	// Banners
	admin.GET("/admin/banners", api.AdminListBanners)
	admin.GET("/admin/banners/:id", api.AdminGetBanner)
	admin.POST("/admin/banners", api.CreateBanner)
	admin.PATCH("/admin/banners/:id", api.UpdateBanner)
	admin.DELETE("/admin/banners/:id", api.DeleteBanner)

	// Reels
	admin.GET("/admin/reels", api.AdminListReels)
	admin.GET("/admin/reels/:id", api.AdminGetReel)
	admin.POST("/admin/reels", api.CreateReel)
	admin.PATCH("/admin/reels/:id", api.UpdateReel)
	admin.DELETE("/admin/reels/:id", api.DeleteReel)

	// Stories
	admin.GET("/admin/stories", api.AdminListStories)
	admin.GET("/admin/stories/:id", api.AdminGetStory)
	admin.POST("/admin/stories", api.CreateStory)
	admin.PATCH("/admin/stories/:id", api.UpdateStory)
	admin.DELETE("/admin/stories/:id", api.DeleteStory)

	// Store
	admin.GET("/admin/store", api.AdminListStoreItems)
	admin.GET("/admin/store/:id", api.AdminGetStoreItem)
	admin.POST("/admin/store", api.CreateStoreItem)
	admin.PATCH("/admin/store/:id", api.UpdateStoreItem)
	admin.DELETE("/admin/store/:id", api.DeleteStoreItem)

	// ImageKit media
	admin.POST("/admin/media/upload", api.UploadMedia)
	admin.DELETE("/admin/media", api.DeleteMedia)

	// Admin user management: look up by unique email, edit, or delete.
	admin.GET("/admin/users/by-email/:email", api.AdminGetUser)
	admin.PATCH("/admin/users/by-email/:email", api.AdminUpdateUser)
	admin.DELETE("/admin/users/by-email/:email", api.AdminDeleteUser)
	admin.GET("/admin/users/by-email/:email/registrations", api.AdminGetUserEvents)
	admin.GET("/admin/users/:id", api.AdminGetUserByID)
	admin.GET("/admin/users/:id/events", api.AdminGetUserEventsByID)

	// Admin QR Scanner routes
	admin.POST("/admin/qr/scan", api.AdminQRScan)
	admin.POST("/admin/qr/gate-checkin", api.AdminGateCheckIn)
	admin.PATCH("/admin/qr/gate/:userId", api.AdminGateCheckIn)
	admin.POST("/admin/qr/hostel-checkin", api.AdminHostelCheckIn)
	admin.PATCH("/admin/qr/hostel/:userId", api.AdminHostelCheckIn)
	admin.POST("/admin/qr/event-checkin", api.AdminEventCheckIn)
	admin.PATCH("/admin/qr/registrations/:id/status", api.AdminEventCheckIn)

	// Admin accommodation management
	admin.GET("/admin/accommodation", api.AdminListAccommodation)
	admin.GET("/admin/accommodation/stats", api.AdminAccommodationStats)
	admin.POST("/admin/accommodation/checkin", api.AdminHostelCheckIn)

	// App configuration: links, maintenance, versions
	admin.GET("/admin/app", api.AdminGetAppConfig)
	admin.PATCH("/admin/app/links", api.AdminUpdateAppLinks)
	admin.PUT("/admin/app/links", api.AdminUpdateAppLinks)
	admin.PATCH("/admin/app/maintenance", api.AdminUpdateAppMaintenance)
	admin.PUT("/admin/app/maintenance", api.AdminUpdateAppMaintenance)
	admin.PATCH("/admin/app/versions", api.AdminUpdateAppVersions)
	admin.PUT("/admin/app/versions", api.AdminUpdateAppVersions)
	admin.PATCH("/admin/app/accommodation", api.AdminUpdateAppAccommodation)
	admin.PUT("/admin/app/accommodation", api.AdminUpdateAppAccommodation)

	// FCM: client registers its token; admins broadcast to audiences.
	authed.POST("/me/fcm-token", api.UpdateFCMToken)
	admin.POST("/admin/notifications", api.SendNotification)

	// Coupons
	authed.POST("/coupons/validate", api.ValidateCoupon)

	// Payments: initiate creates a Easebuzz checkout link; callback receives
	// the Easebuzz redirect/webhook; status lets the app poll outcome.
	authed.POST("/payments/initiate", api.InitiatePayment)
	v1.POST("/payments/callback", api.PaymentCallback)
	if cfg.PaymentsDummy || cfg.EasebuzzKey == "" || cfg.EasebuzzSalt == "" {
		v1.GET("/payments/dummy", api.DummyPayment) // open: local test bypass, never in prod
	}
	authed.GET("/payments/:merchantOrderId", api.GetPayment)

	return r
}
