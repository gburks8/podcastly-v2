import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Video, Image, Lock } from "lucide-react";
import type { ContentItem } from "@shared/schema";

const stripePromise = loadStripe(process.env.STRIPE_PUBLIC_KEY || "pk_test_51QKnSvFsHlZWd8GJE6ZkGZQNb1TeLF96J9zWfJZLX3tFLfW4XsJrPqsA8Qm3KVjnzHJoMfKPVqQFnUOj6IIhOIgB00XOKnz2SY");

function CheckoutForm({ contentItem }: { contentItem: ContentItem }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
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
          description: "You now have access to this content!",
        });
      }
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
        className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          `Pay $${contentItem.price || "25.00"}`
        )}
      </Button>
    </form>
  );
}

export default function Purchase() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/purchase/:id");
  const contentId = params?.id ? parseInt(params.id) : null;
  const [clientSecret, setClientSecret] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: contentItem, isLoading: isLoadingContent } = useQuery({
    queryKey: [`/api/content/${contentId}/details`],
    enabled: !!contentId,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/content/${contentId}/create-payment-intent`);
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
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
          title: "Payment Setup Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    if (contentId && contentItem) {
      createPaymentMutation.mutate(contentId);
    }
  }, [contentId, contentItem]);

  if (isLoading || isLoadingContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!contentItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Not Found</h2>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Purchase Content
          </h1>
          <p className="text-gray-600">
            Complete your payment to access this premium content
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {contentItem.type === "video" ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <Image className="w-5 h-5" />
                )}
                {contentItem.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-32 bg-gray-100 rounded-md flex items-center justify-center relative overflow-hidden">
                  {contentItem.thumbnailUrl ? (
                    <img 
                      src={contentItem.thumbnailUrl} 
                      alt={contentItem.title}
                      className="w-full h-full object-cover blur-sm"
                    />
                  ) : (
                    <div className="text-gray-400">
                      {contentItem.type === "video" ? (
                        <Video className="w-8 h-8" />
                      ) : (
                        <Image className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {contentItem.description && (
                  <p className="text-sm text-gray-600">{contentItem.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">
                    {contentItem.type === "video" ? "Video Content" : "Professional Photo"}
                  </Badge>
                  <div className="text-2xl font-bold text-primary">
                    ${contentItem.price || "25.00"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm contentItem={contentItem} />
                </Elements>
              ) : createPaymentMutation.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mr-2" />
                  Setting up payment...
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Unable to set up payment</p>
                  <Button onClick={() => createPaymentMutation.mutate(contentId!)}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}