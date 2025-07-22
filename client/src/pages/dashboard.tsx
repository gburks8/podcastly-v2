import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { Video, Image, Calendar, ChevronRight, Settings, LogOut, FolderOpen } from "lucide-react";
import type { ContentItem, Download as DownloadType, Project } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const { data: userProjects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Get content counts for each project
  const { data: allContent = [] } = useQuery<ContentItem[]>({
    queryKey: ["/api/content"],
    enabled: isAuthenticated,
  });

  const { data: downloadHistory = [] } = useQuery({
    queryKey: ["/api/downloads/history"],
    enabled: isAuthenticated,
  });

  // Projects are now fetched from the API

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to get content counts for a project
  const getProjectContentCounts = (projectId: string) => {
    const projectContent = allContent.filter(item => item.projectId === projectId);
    const videos = projectContent.filter(item => item.type === 'video');
    const headshots = projectContent.filter(item => item.type === 'headshot');
    return { videos: videos.length, headshots: headshots.length, total: projectContent.length };
  };

  const totalVideos = allContent.filter(item => item.type === 'video').length;
  const totalHeadshots = allContent.filter(item => item.type === 'headshot').length;

  const handleProjectClick = (projectId: string) => {
    setLocation(`/project/${projectId}`);
  };

  if (isLoading || projectsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">MediaPro</h1>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <a href="#" className="text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium">Dashboard</a>
                <a href="#" className="text-gray-600 hover:text-primary px-3 py-2 text-sm font-medium">My Content</a>
                <a href="#" className="text-gray-600 hover:text-primary px-3 py-2 text-sm font-medium">Downloads</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {/* Temporary: Show admin panel for this user until session refresh */}
              {(user?.isAdmin || user?.email === 'grantburks@optikoproductions.com') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/admin')}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Button>
              )}
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/logout");
                    window.location.href = "/auth";
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to log out",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-gray-600">
            Your content is organized into projects. Click on any project to view and download your deliverables.
          </p>
          
          {/* TEMPORARY TEST LINK FOR DEBUGGING */}
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="font-bold text-yellow-800 mb-2">DEBUG: Test Project Link</p>
            <a 
              href="/project/project-1753131122192-fvaprm6dj" 
              className="text-blue-600 underline hover:text-blue-800"
              onClick={(e) => {
                console.log('🎯 TEST PROJECT LINK CLICKED!');
                console.log('Target URL:', '/project/project-1753131122192-fvaprm6dj');
              }}
            >
              Direct Project Link (Click to Test)
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProjects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVideos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Headshots</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHeadshots}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Your Projects</h3>
            <Badge variant="secondary">{userProjects.length} projects</Badge>
          </div>

          {userProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProjects.map((project) => {
                const counts = getProjectContentCounts(project.id);
                return (
                  <Card 
                    key={project.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(project.createdAt)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center">
                            <Video className="w-4 h-4 mr-1" />
                            {counts.videos} Videos
                          </span>
                          <span className="flex items-center">
                            <Image className="w-4 h-4 mr-1" />
                            {counts.headshots} Headshots
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{counts.total} items total</Badge>
                          <span className="text-sm text-primary font-medium">View Project →</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground">
                  Your content projects will appear here once they're uploaded.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}