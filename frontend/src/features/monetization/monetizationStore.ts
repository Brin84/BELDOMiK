import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type {
  PaginatedResponse,
  Payment,
  PaymentCheckout,
  Promotion,
  PromotionApplied,
  Subscription,
  SubscriptionPlanInfo,
} from '@/shared/api/types';

interface MonetizationState {
  // Promotion catalog
  promotions: Promotion[];
  plans: SubscriptionPlanInfo[];
  isLoadingCatalog: boolean;

  // Property promotions
  propertyPromotions: PromotionApplied[];

  // User subscriptions & payments
  subscriptions: Subscription[];
  payments: Payment[];
  paymentsTotal: number;
  isLoadingHistory: boolean;

  // Actions
  fetchPromotions: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchPropertyPromotions: (propertyId: number) => Promise<void>;
  promoteProperty: (propertyId: number, promotionType: string) => Promise<PaymentCheckout>;
  confirmPayment: (paymentId: number) => Promise<Payment>;
  createSubscription: (plan: string, agencyId: number) => Promise<PaymentCheckout | Subscription>;
  fetchSubscriptions: () => Promise<void>;
  fetchPayments: (page?: number) => Promise<void>;
}

export const useMonetizationStore = create<MonetizationState>((set) => ({
  promotions: [],
  plans: [],
  isLoadingCatalog: false,

  propertyPromotions: [],

  subscriptions: [],
  payments: [],
  paymentsTotal: 0,
  isLoadingHistory: false,

  fetchPromotions: async () => {
    set({ isLoadingCatalog: true });
    try {
      const promotions = await api.get<Promotion[]>(API_ENDPOINTS.monetization.promotions);
      set({ promotions, isLoadingCatalog: false });
    } catch {
      set({ isLoadingCatalog: false });
    }
  },

  fetchPlans: async () => {
    try {
      const plans = await api.get<SubscriptionPlanInfo[]>(API_ENDPOINTS.monetization.plans);
      set({ plans });
    } catch {
      // ignore — plans are a nice-to-have
    }
  },

  fetchPropertyPromotions: async (propertyId) => {
    try {
      const propertyPromotions = await api.get<PromotionApplied[]>(
        API_ENDPOINTS.monetization.propertyPromotions(propertyId)
      );
      set({ propertyPromotions });
    } catch {
      set({ propertyPromotions: [] });
    }
  },

  promoteProperty: async (propertyId, promotionType) => {
    return api.post<PaymentCheckout>(API_ENDPOINTS.monetization.promote(propertyId), {
      promotion_type: promotionType,
    });
  },

  confirmPayment: async (paymentId) => {
    return api.post<Payment>(API_ENDPOINTS.monetization.confirmPayment(paymentId));
  },

  createSubscription: async (plan, agencyId) => {
    return api.post<PaymentCheckout | Subscription>(API_ENDPOINTS.monetization.subscriptions, {
      plan,
      agency_id: agencyId,
    });
  },

  fetchSubscriptions: async () => {
    try {
      const subscriptions = await api.get<Subscription[]>(API_ENDPOINTS.monetization.subscriptions);
      set({ subscriptions });
    } catch {
      set({ subscriptions: [] });
    }
  },

  fetchPayments: async (page = 1) => {
    set({ isLoadingHistory: true });
    try {
      const data = await api.get<PaginatedResponse<Payment>>(API_ENDPOINTS.monetization.payments, {
        page,
        page_size: 20,
      });
      set({ payments: data.items, paymentsTotal: data.total, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },
}));
