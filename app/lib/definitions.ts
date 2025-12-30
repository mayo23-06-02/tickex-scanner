export interface TicketType {
  _id: string;
  name: string;
  event: string; // Event ID
}

export interface Ticket {
  _id: string;
  ticketCode: string;
  status: "active" | "checked_in" | "revoked";
  ticketTypeId: TicketType;
  orderId: string;
  attendeeName: string;
  updatedAt: Date;
}

export type ScanStatus = "valid" | "invalid" | "duplicate" | "error";

export type ScanResponse =
  | { success: true; ticket: { name: string; type: string; id: string } }
  | {
      success: false;
      error: "NOT_FOUND" | "WRONG_EVENT" | "ALREADY_USED" | "REVOKED";
      details?: any;
    };

export interface EventSummary {
  id: string;
  name: string;
  date: string;
  stats: {
    checkedIn: number;
    total: number;
  };
}
export interface TicketLogItem {
  id: string;
  ticketCode: string;
  status: "active" | "checked_in" | "revoked";
  attendeeName: string;
  ticketType: string;
  timestamp: string;
  purchaseDate?: string;
  orderId: string;
  buyerName?: string;
  buyerEmail?: string;
}
