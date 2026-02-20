import type { Role, UserStatus, BookingStatus, TicketStatus } from "../enums";

// ─── Auth ────────────────────────────────────────────────
export interface SignUpRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: "CLIENT" | "PROVIDER";
}

export interface ProviderSignUpRequest extends SignUpRequest {
    role: "PROVIDER";
    phone: string;
    businessName: string;
    profession: string;
    serviceDescription: string;
    address: string;
    city: string;
    workingHours?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthTokenResponse {
    accessToken: string;
    user: UserResponse;
}

// ─── User ────────────────────────────────────────────────
export interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: Role;
    status: UserStatus;
    createdAt: string;
}

// ─── Category ────────────────────────────────────────────
export interface CategoryResponse {
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
}

export interface CreateCategoryRequest {
    name: string;
    icon: string;
}

// ─── Provider Profile ────────────────────────────────────
export interface ProviderProfileResponse {
    id: string;
    userId: string;
    name: string;
    description: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    workingHours: string;
    verified: boolean;
    createdAt: string;
    user?: UserResponse;
    services?: ServiceResponse[];
}

export interface CreateProviderProfileRequest {
    name: string;
    description: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    workingHours: string;
}

// ─── Service ─────────────────────────────────────────────
export interface ServiceResponse {
    id: string;
    providerId: string;
    categoryId: string;
    title: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
    category?: CategoryResponse;
    provider?: ProviderProfileResponse;
}

export interface CreateServiceRequest {
    categoryId: string;
    title: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
}

export interface UpdateServiceRequest {
    title?: string;
    description?: string;
    durationMinutes?: number;
    priceCents?: number;
    isActive?: boolean;
}

// ─── Availability Slot ───────────────────────────────────
export interface AvailabilitySlotResponse {
    id: string;
    providerId: string;
    startAt: string;
    endAt: string;
    isBooked: boolean;
    timezone: string;
}

export interface CreateAvailabilitySlotsRequest {
    slots: Array<{
        startAt: string;
        endAt: string;
        timezone: string;
    }>;
}

// ─── Booking ─────────────────────────────────────────────
export interface BookingResponse {
    id: string;
    clientId: string;
    providerId: string;
    serviceId: string;
    slotId: string;
    status: BookingStatus;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    service?: ServiceResponse;
    slot?: AvailabilitySlotResponse;
    client?: UserResponse;
    provider?: ProviderProfileResponse;
}

export interface CreateBookingRequest {
    serviceId: string;
    slotId: string;
    note?: string;
}

// ─── Review ──────────────────────────────────────────────
export interface ReviewResponse {
    id: string;
    bookingId: string;
    rating: number;
    comment: string;
    isHidden: boolean;
    createdAt: string;
    user?: UserResponse;
}

// ─── Notification ────────────────────────────────────────
export interface NotificationResponse {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
}

// ─── Audit Log ───────────────────────────────────────────
export interface AuditLogResponse {
    id: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

// ─── Support Ticket ──────────────────────────────────────
export interface TicketResponse {
    id: string;
    createdByUserId: string;
    bookingId: string | null;
    message: string;
    status: TicketStatus;
    createdAt: string;
}

// ─── Stats (Admin) ───────────────────────────────────────
export interface AdminStatsResponse {
    totalUsers: number;
    totalProviders: number;
    totalClients: number;
    totalBookings: number;
    bookingsByStatus: Record<string, number>;
    topCategories: Array<{ categoryId: string; name: string; count: number }>;
}

// ─── Search ──────────────────────────────────────────────
export interface SearchProvidersQuery {
    query?: string;
    categoryId?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
}

// ─── Paginated ───────────────────────────────────────────
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

// ─── API Error ───────────────────────────────────────────
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
