import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project-detail";
import Checkout from "@/pages/checkout";
import Purchase from "@/pages/purchase";
import Admin from "@/pages/admin";
import UserProfile from "@/pages/user-profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('Router render:', {
    isAuthenticated,
    isLoading,
    currentPath: window.location.pathname,
    url: window.location.href
  });

  if (isLoading) {
    console.log('Router showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPath = window.location.pathname;
  console.log('🔍 Manual routing - path:', currentPath);

  // Manual routing to ensure exclusivity
  if (!isAuthenticated) {
    if (currentPath === '/') {
      return <Landing />;
    } else if (currentPath === '/auth') {
      return <Auth />;
    } else {
      // Redirect to auth with the intended destination
      const redirectUrl = `/auth?redirect=${encodeURIComponent(currentPath + window.location.search)}`;
      window.location.href = redirectUrl;
      return null;
    }
  }

  // Authenticated routes - check most specific first
  if (currentPath.startsWith('/admin/user/')) {
    console.log('👤 User profile route matched');
    return <UserProfile />;
  } else if (currentPath === '/admin') {
    console.log('👑 Admin route matched');
    return <Admin />;
  } else if (currentPath.startsWith('/project/')) {
    console.log('🎯 PROJECT ROUTE MATCHED!');
    return <ProjectDetail />;
  } else if (currentPath === '/checkout') {
    console.log('💳 Checkout route matched');
    return <Checkout />;
  } else if (currentPath.startsWith('/purchase/')) {
    console.log('🛒 Purchase route matched');
    return <Purchase />;
  } else if (currentPath === '/') {
    console.log('🏠 Dashboard route matched');
    return <Dashboard />;
  } else {
    // Unknown route - redirect to dashboard
    window.location.href = '/';
    return null;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
