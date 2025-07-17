import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Video, Camera } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PackagePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  freeSelectionsUsed: number;
  totalVideos: number;
  totalHeadshots: number;
  userPackages: {
    hasAdditional3Videos: boolean;
    hasAllRemainingContent: boolean;
  };
}

function PackageCheckoutForm({ 
  packageType, 
  onSuccess, 
  onClose 
}: { 
  packageType: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard",
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
          title: "Package Purchased Successfully!",
          description: "You now have access to additional content.",
        });
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          `Complete Purchase - ${packageType === "additional_3_videos" ? "$199" : "$499"}`
        )}
      </Button>
    </form>
  );
}

export function PackagePurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  freeSelectionsUsed,
  totalVideos,
  totalHeadshots,
  userPackages
}: PackagePurchaseModalProps) {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const createPackagePaymentMutation = useMutation({
    mutationFn: async (packageType: string) => {
      const response = await apiRequest("POST", "/api/packages/create-payment-intent", {
        packageType
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePackageSelect = (packageType: string) => {
    setSelectedPackage(packageType);
    createPackagePaymentMutation.mutate(packageType);
  };

  const handleBackToSelection = () => {
    setSelectedPackage(null);
    setClientSecret(null);
  };

  const remainingVideos = totalVideos - freeSelectionsUsed;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Your Package</DialogTitle>
        </DialogHeader>

        {!selectedPackage ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600">
                You've selected your {freeSelectionsUsed} free videos. 
                Choose a package to access more content:
              </p>
            </div>

            <div className="grid gap-4">
              {/* Additional 3 Videos Package */}
              {!userPackages.hasAdditional3Videos && !userPackages.hasAllRemainingContent && (
                <Card 
                  className="border-2 border-blue-200 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => handlePackageSelect("additional_3_videos")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Additional 3 Videos</CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        $199
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-blue-600" />
                        <span>Access to 3 additional videos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>Download and keep forever</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>High-quality video files</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Remaining Content Package */}
              {!userPackages.hasAllRemainingContent && (
                <Card 
                  className="border-2 border-green-200 hover:border-green-300 cursor-pointer transition-colors relative"
                  onClick={() => handlePackageSelect("all_remaining_content")}
                >
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 bg-green-100 text-green-800"
                  >
                    Best Value
                  </Badge>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">All Remaining Content</CardTitle>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        $499
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-green-600" />
                        <span>Access to all {remainingVideos} remaining videos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-600" />
                        <span>Access to all {totalHeadshots} headshots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>Download and keep forever</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>High-quality files</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Show if user already has packages */}
            {userPackages.hasAdditional3Videos && !userPackages.hasAllRemainingContent && (
              <div className="text-center p-4 bg-blue-50 rounded-md">
                <p className="text-blue-700 font-medium">You have the Additional 3 Videos package!</p>
                <p className="text-sm text-blue-600 mt-1">
                  Upgrade to get all remaining content including headshots.
                </p>
              </div>
            )}

            {userPackages.hasAllRemainingContent && (
              <div className="text-center p-4 bg-green-50 rounded-md">
                <p className="text-green-700 font-medium">
                  You have access to all remaining content!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  You can download all videos and headshots.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleBackToSelection}>
                ← Back to Packages
              </Button>
              <h3 className="text-lg font-semibold">
                {selectedPackage === "additional_3_videos" 
                  ? "Additional 3 Videos - $199" 
                  : "All Remaining Content - $499"}
              </h3>
            </div>

            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PackageCheckoutForm 
                  packageType={selectedPackage}
                  onSuccess={onSuccess}
                  onClose={onClose}
                />
              </Elements>
            )}

            {createPackagePaymentMutation.isPending && (
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-gray-600">Setting up payment...</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}