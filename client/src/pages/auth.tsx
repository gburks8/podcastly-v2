import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Video, Image, Download, Star } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function Auth() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      console.log('🎯 USER IS AUTHENTICATED - CHECKING REDIRECT');
      console.log('Current location:', window.location.href);
      
      // Only redirect if we're actually on the auth page
      if (window.location.pathname !== '/auth') {
        console.log('Already authenticated but not on auth page, skipping redirect');
        return;
      }
      
      // Get the intended destination from URL params only - more reliable than localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      
      console.log('Already authenticated redirect from auth page:', {
        redirectParam,
        currentURL: window.location.href,
        fullSearch: window.location.search
      });
      
      const redirectTo = redirectParam ? decodeURIComponent(redirectParam) : '/';
      
      console.log('Redirecting already-auth user to:', redirectTo);
      window.location.href = redirectTo;
    }
  }, [user, isLoading]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      // Get the intended destination from URL params only - more reliable than localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      
      console.log('Login success redirect:', {
        redirectParam,
        currentURL: window.location.href,
        fullSearch: window.location.search
      });
      
      const redirectTo = redirectParam ? decodeURIComponent(redirectParam) : '/';
      
      console.log('Redirecting after login to:', redirectTo);
      window.location.href = redirectTo;
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome to MediaPro!",
        description: "Your account has been created successfully.",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create account",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">MediaPro</h1>
            <p className="text-gray-600">Professional content for real estate agents</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to access your content library
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>
                    Get started with your MediaPro account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstName">First Name</Label>
                        <Input
                          id="register-firstName"
                          placeholder="John"
                          {...registerForm.register("firstName")}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-lastName">Last Name</Label>
                        <Input
                          id="register-lastName"
                          placeholder="Doe"
                          {...registerForm.register("lastName")}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        {...registerForm.register("email")}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-blue-600 text-white">
        <div className="flex flex-col justify-center px-12 py-24">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">
              Professional Content for Real Estate Success
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Access high-quality video podcasts and professional headshots designed specifically for real estate agents.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Video Podcast Content</h3>
                  <p className="text-blue-100 text-sm">Professional video content for your marketing</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <Image className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Professional Headshots</h3>
                  <p className="text-blue-100 text-sm">High-quality photos for your brand</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Instant Downloads</h3>
                  <p className="text-blue-100 text-sm">Get your content immediately after selection</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Free Content Included</h3>
                  <p className="text-blue-100 text-sm">3 free videos + 1 free headshot to get started</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}