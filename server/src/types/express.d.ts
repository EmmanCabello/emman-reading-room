import type { AllowanceState } from "../middleware/allowanceGuard";

export interface SignedInPatron {
  id: string;
  email: string;
  displayName: string;
  role: "reader" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      patron?: SignedInPatron;
      visitorIp: string;
      allowance?: AllowanceState;
    }
  }
}

export {};
