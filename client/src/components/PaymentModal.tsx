import { useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Lock, CreditCard } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  premiumVideoCount: number;
  premiumHeadshotCount: number;
}

const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase! You now have access to all premium content.",
      });
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <div className="flex space-x-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-primary hover:bg-blue-700"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pay Securely
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export function PaymentModal({ isOpen, onClose, premiumVideoCount, premiumHeadshotCount }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initializePayment = async () => {
    if (clientSecret) return; // Already initialized
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", {});
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      initializePayment();
    } else {
      onClose();
    }
  };

  const handleSuccess = () => {
    onClose();
    // Refresh the page to update the UI with new access permissions
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Complete Your Purchase
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Premium Content Package</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {premiumVideoCount} Additional Social Media Videos</li>
              <li>• {premiumHeadshotCount} Extra Professional Headshots</li>
              <li>• High-resolution downloads</li>
              <li>• Instant access after payment</li>
            </ul>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">$97.00</span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading payment form...</p>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm onSuccess={handleSuccess} />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load payment form. Please try again.</p>
              <Button onClick={initializePayment} className="mt-4">
                Retry
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Payments processed securely by Stripe. Your information is protected.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
