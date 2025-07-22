import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Video, Camera, Download, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, ContentItem } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface ProjectPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project: Project;
  projectContent: ContentItem[];
  freeSelectionsUsed: number;
}

function ProjectCheckoutForm({ 
  packageType,
  projectId,
  amount,
  onSuccess, 
  onClose 
}: { 
  packageType: string;
  projectId: string;
  amount: number;
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
          return_url: window.location.origin + `/project/${projectId}`,
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
          description: "You now have access to additional content in this project.",
        });
        onSuccess();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? "Processing..." : `Pay $${amount}`}
        </Button>
      </div>
    </form>
  );
}

export function ProjectPricingModal({ isOpen, onClose, onSuccess, project, projectContent, freeSelectionsUsed }: ProjectPricingModalProps) {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const videos = projectContent.filter(item => item.type === 'video');
  const headshots = projectContent.filter(item => item.type === 'headshot');
  const freeVideosRemaining = Math.max(0, (project.freeVideoLimit || 3) - freeSelectionsUsed);

  // Check package access
  const { data: hasAdditional3Access = false } = useQuery({
    queryKey: [`/api/projects/${project.id}/package-access/additional_3_videos`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/package-access/additional_3_videos`, {
        credentials: "include",
      });
      const data = await response.json();
      return data.hasAccess;
    },
    enabled: isOpen,
  });

  const { data: hasAllContentAccess = false } = useQuery({
    queryKey: [`/api/projects/${project.id}/package-access/all_content`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/package-access/all_content`, {
        credentials: "include",
      });
      const data = await response.json();
      return data.hasAccess;
    },
    enabled: isOpen,
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (packageType: string) => {
      const amount = packageType === 'additional_3_videos' ? 
        parseFloat(project.additional3VideosPrice || '199') : 
        parseFloat(project.allContentPrice || '499');
      
      const response = await apiRequest("POST", `/api/projects/${project.id}/create-payment-intent`, {
        packageType,
        amount: Math.round(amount * 100), // Convert to cents
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to set up payment",
        variant: "destructive",
      });
    },
  });

  const handleSelectPackage = (packageType: string) => {
    setSelectedPackage(packageType);
    createPaymentIntentMutation.mutate(packageType);
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '$0.00';
    return `$${parseFloat(price).toFixed(0)}`;
  };

  if (selectedPackage && clientSecret) {
    const amount = selectedPackage === 'additional_3_videos' ? 
      parseFloat(project.additional3VideosPrice || '199') : 
      parseFloat(project.allContentPrice || '499');

    return (
      <Dialog open={isOpen} onOpenChange={() => { onClose(); setSelectedPackage(null); setClientSecret(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Selected Package:</p>
                <p className="text-lg font-semibold">
                  {selectedPackage === 'additional_3_videos' ? 'Additional 3 Videos' : 'All Content Access'}
                </p>
                <p className="text-lg text-blue-600 font-bold">${amount}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setSelectedPackage(null); setClientSecret(null); }}
              >
                Change Package
              </Button>
            </div>
          </div>
          
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <ProjectCheckoutForm
              packageType={selectedPackage}
              projectId={project.id}
              amount={amount}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Package - {project.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Additional 3 Videos Package */}
          <Card className={`relative ${hasAdditional3Access ? 'opacity-50' : 'cursor-pointer hover:shadow-lg transition-shadow'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Additional 3 Videos</span>
                <Badge variant="secondary">
                  {formatPrice(project.additional3VideosPrice)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Access to 3 more videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Total: {project.freeVideoLimit || 3} free + 3 additional = 6 videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{videos.length} videos available in this project</span>
                </div>
              </div>
              
              {hasAdditional3Access ? (
                <Button disabled className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Purchased
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSelectPackage('additional_3_videos')}
                  disabled={createPaymentIntentMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {createPaymentIntentMutation.isPending ? "Setting up..." : `Select Package - ${formatPrice(project.additional3VideosPrice)}`}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* All Content Package */}
          <Card className={`relative ${hasAllContentAccess ? 'opacity-50' : 'cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary'}`}>
            <Badge className="absolute -top-2 -right-2 bg-primary">Best Value</Badge>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Content Access</span>
                <Badge variant="secondary">
                  {formatPrice(project.allContentPrice)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Access to ALL {videos.length} videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Access to ALL {headshots.length} professional headshots</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Complete project access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Includes premium headshots</span>
                </div>
              </div>
              
              {hasAllContentAccess ? (
                <Button disabled className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Purchased
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSelectPackage('all_content')}
                  disabled={createPaymentIntentMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {createPaymentIntentMutation.isPending ? "Setting up..." : `Select Package - ${formatPrice(project.allContentPrice)}`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Your Current Access:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-500" />
              <span>Free downloads used: {freeSelectionsUsed} of {project.freeVideoLimit || 3}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-500" />
              <span>Free downloads remaining: {freeVideosRemaining}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Select a package above to proceed to payment</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}