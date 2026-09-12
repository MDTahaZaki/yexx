import { type } from "@/config/brand";
import SweepButton from "./SweepButton";

interface OrderConfirmationProps {
  paymentId: string;
  onClose: () => void;
}

export default function OrderConfirmation({ paymentId, onClose }: OrderConfirmationProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h3 className={`${type.h3} font-bold uppercase`}>Order Confirmed</h3>
      <p className="text-sm text-black/65">
        Thanks — your order is on its way. A confirmation has been sent to your email.
      </p>
      <p className="text-xs tracking-[0.05em] text-black/50">Payment ID: {paymentId}</p>
      <SweepButton variant="dark" onClick={onClose}>
        Close
      </SweepButton>
    </div>
  );
}
