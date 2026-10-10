import { apiFetch, readError } from "./client";

export interface Payment {
  id: string;
  merchantOrderId: string;
  userId: string;
  eventId: string;
  teamId: string;
  paymentType: string;
  originalAmount: number;
  transactionFees: number;
  finalAmount: number;
  status: "pending" | "success" | "failure";
  createdAt: string;
  completedAt?: string;
  processedIntentions: {
    eventRegistration?: {
      eventId: string;
      eventType: string;
      teamId: string;
      teamName: string;
      amount: number;
    } | null;
    accommodation: null;
  };
}

export interface InitiatePaymentResponse {
  paymentUrl: string;
  merchantOrderId: string;
}

/**
 * Initiate a payment for an event. Returns the Easebuzz checkout URL
 * that should be opened in a WebView.
 */
export async function initiateEventPayment(
  eventId: string,
  teamId?: string
): Promise<InitiatePaymentResponse> {
  const body: Record<string, string> = { eventId };
  if (teamId) body.teamId = teamId;

  const response = await apiFetch(
    "/payments/initiate",
    { method: "POST", body: JSON.stringify(body) },
    "required"
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to initiate payment"));
  }
  return response.json();
}

/**
 * Poll the payment status by merchantOrderId. Used after the WebView
 * returns to check if payment completed.
 */
export async function getPaymentStatus(
  merchantOrderId: string
): Promise<Payment> {
  const response = await apiFetch(
    `/payments/${merchantOrderId}`,
    {},
    "required"
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to fetch payment status"));
  }
  const data = await response.json();
  return data.payment;
}
