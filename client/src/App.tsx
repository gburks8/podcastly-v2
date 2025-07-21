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

  console.log('🔍 Router Switch render - checking all routes against:', window.location.pathname);

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={Auth} />
          <Route path="*">
            {() => {
              // Redirect to auth with the intended destination as URL parameter
              const currentPath = window.location.pathname + window.location.search;
              if (currentPath !== '/' && currentPath !== '/auth') {
                // Encode the path to safely pass as URL parameter
                const redirectUrl = `/auth?redirect=${encodeURIComponent(currentPath)}`;
                window.location.href = redirectUrl;
                return null;
              }
              return <Auth />;
            }}
          </Route>
        </>
      ) : (
        <>
          <Route path="/">
            {() => {
              console.log('🏠 Dashboard route matched');
              return <Dashboard />;
            }}
          </Route>
          <Route path="/project/:projectId">
            {(params) => {
              console.log('🎯 PROJECT ROUTE MATCHED!', {
                projectId: params.projectId,
                currentPath: window.location.pathname,
                url: window.location.href
              });
              return <ProjectDetail />;
            }}
          </Route>
          <Route path="/checkout">
            {() => {
              console.log('💳 Checkout route matched');
              return <Checkout />;
            }}
          </Route>
          <Route path="/purchase/:id">
            {(params) => {
              console.log('🛒 Purchase route matched', params.id);
              return <Purchase />;
            }}
          </Route>
          <Route path="/admin">
            {() => {
              console.log('👑 Admin route matched');
              return <Admin />;
            }}
          </Route>
          <Route path="/admin/user/:userId">
            {(params) => {
              console.log('👤 User profile route matched', params.userId);
              return <UserProfile />;
            }}
          </Route>
          <Route path="*">
            {() => {
              console.log('🚨 CATCH-ALL ROUTE MATCHED - REDIRECTING TO DASHBOARD', {
                currentPath: window.location.pathname,
                url: window.location.href
              });
              return <Redirect to="/" />;
            }}
          </Route>
        </>
      )}
    </Switch>
  );
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
