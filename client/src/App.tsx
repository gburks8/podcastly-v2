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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={Auth} />
          <Route path="*">
            {() => {
              // Store the intended destination for after login
              const currentPath = window.location.pathname + window.location.search;
              if (currentPath !== '/' && currentPath !== '/auth') {
                localStorage.setItem('intended_destination', currentPath);
              }
              return <Auth />;
            }}
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/project/:projectId" component={ProjectDetail} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/purchase/:id" component={Purchase} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/user/:userId" component={UserProfile} />
          <Route path="*">
            <Redirect to="/" />
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
