import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { Video, Image, Calendar, ChevronRight, Settings, LogOut, FolderOpen, Download, BarChart3 } from "lucide-react";
import type { ContentItem, Download as DownloadType, Project } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const { data: downloadHistory = [] } = useQuery<DownloadType[]>({
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
    window.location.href = `/project/${projectId}`;
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">MediaPro</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Admin panel for admin users */}
              {(user?.isAdmin || user?.email === 'grantburks@optikoproductions.com') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('🔧 Admin Panel button clicked! Navigating to /admin');
                    window.location.href = '/admin';
                  }}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Button>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              My Content
            </TabsTrigger>
            <TabsTrigger value="downloads" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Downloads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Welcome Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your content is organized into projects. Click on any project to view and download your deliverables.
              </p>
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
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Projects</h3>
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
          </TabsContent>

          <TabsContent value="content" className="space-y-8">
            {/* My Content Tab */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All My Content</h3>
                <Badge variant="secondary">{allContent.length} items total</Badge>
              </div>

              {allContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allContent.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {item.type === 'video' ? (
                          item.thumbnailUrl ? (
                            <img 
                              src={item.thumbnailUrl} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video className="w-12 h-12 text-gray-400" />
                          )
                        ) : (
                          item.thumbnailUrl || item.fileUrl ? (
                            <img 
                              src={item.thumbnailUrl || item.fileUrl} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image className="w-12 h-12 text-gray-400" />
                          )
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-1 truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No content yet</h3>
                    <p className="text-muted-foreground">
                      Your content will appear here once it's uploaded to projects.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="downloads" className="space-y-8">
            {/* Downloads Tab */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Download History</h3>
                <Badge variant="secondary">{downloadHistory.length} downloads</Badge>
              </div>

              {downloadHistory.length > 0 ? (
                <div className="space-y-4">
                  {downloadHistory.map((download, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Download className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{download.fileName || 'Download'}</h4>
                              <p className="text-sm text-muted-foreground">
                                Downloaded on {formatDate(download.createdAt || new Date())}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {download.fileSize ? `${Math.round(download.fileSize / 1024 / 1024)}MB` : 'Unknown size'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No downloads yet</h3>
                    <p className="text-muted-foreground">
                      Your download history will appear here after you download content.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}