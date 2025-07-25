import React from "react"
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { isUnauthorizedError } from "../lib/authUtils";
import { apiRequest } from "../lib/queryClient";
import { useLocation } from "wouter";

import { 
  Video, 
  Image, 
  Calendar, 
  ChevronRight, 
  Settings, 
  LogOut, 
  FolderOpen, 
  Download, 
  BarChart3,
  Play,
  User
} from "lucide-react";
import type { ContentItem, Download as DownloadType, Project } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("overview");

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediaPro
                </h1>
              </div>
              
              {/* Navigation Pills */}
              <nav className="hidden md:flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {[
                  { id: "overview", label: "Overview", icon: BarChart3 },
                  { id: "content", label: "My Content", icon: FolderOpen },
                  { id: "downloads", label: "Downloads", icon: Download },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeView === item.id
                          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {/* Admin Panel Button */}
              {(user?.isAdmin || user?.email === 'grantburks@optikoproductions.com') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    window.location.href = '/admin';
                  }}
                  className="flex items-center gap-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Button>
              )}
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                  {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              
              {/* Sign Out */}
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
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Mobile Navigation */}
        <div className="md:hidden mb-6">
          <div className="flex space-x-1 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-md">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "content", label: "Content", icon: FolderOpen },
              { id: "downloads", label: "Downloads", icon: Download },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === item.id
                      ? "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Views */}
        {activeView === "overview" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Welcome back, {user?.firstName}! 👋
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Your content is organized into projects. Click on any project to view and download your deliverables.
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Projects</CardTitle>
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{userProjects.length}</div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {userProjects.length === 0 ? "No projects yet" : "Active projects"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Videos</CardTitle>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{totalVideos}</div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Video content available
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Headshots</CardTitle>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Image className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">{totalHeadshots}</div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Professional headshots
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Projects Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Projects</h3>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {userProjects.length} projects
                  </Badge>
                </div>
              </div>

              <div className="p-8">
                {userProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userProjects.map((project) => {
                      const counts = getProjectContentCounts(project.id);
                      return (
                        <Card 
                          key={project.id} 
                          className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          onClick={() => handleProjectClick(project.id)}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {project.name}
                              </CardTitle>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(project.createdAt)}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
                                <span className="flex items-center text-slate-600 dark:text-slate-400">
                                  <Video className="w-4 h-4 mr-2 text-purple-500" />
                                  {counts.videos} Videos
                                </span>
                                <span className="flex items-center text-slate-600 dark:text-slate-400">
                                  <Image className="w-4 h-4 mr-2 text-green-500" />
                                  {counts.headshots} Headshots
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
                                  {counts.total} items total
                                </Badge>
                                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                  View Project →
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FolderOpen className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No projects yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Your content projects will appear here once they're uploaded. Contact your admin to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === "content" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">All My Content</h3>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {allContent.length} items total
                  </Badge>
                </div>
              </div>

              <div className="p-8">
                {allContent.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allContent.map((item) => (
                      <Card key={item.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700">
                        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center overflow-hidden">
                          {item.type === 'video' ? (
                            item.thumbnailUrl ? (
                              <img 
                                src={item.thumbnailUrl} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20">
                                <Video className="w-12 h-12 text-purple-500" />
                              </div>
                            )
                          ) : (
                            item.thumbnailUrl || item.fileUrl ? (
                              <img 
                                src={item.thumbnailUrl || item.fileUrl} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20">
                                <Image className="w-12 h-12 text-green-500" />
                              </div>
                            )
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-sm mb-1 truncate text-slate-900 dark:text-slate-100">{item.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mb-1">{item.type}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Video className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No content yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Your content will appear here once it's uploaded to projects.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === "downloads" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Download History</h3>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {downloadHistory.length} downloads
                  </Badge>
                </div>
              </div>

              <div className="p-8">
                {downloadHistory.length > 0 ? (
                  <div className="space-y-4">
                    {downloadHistory.map((download, index: number) => (
                      <Card key={index} className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                <Download className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                  Download #{index + 1}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Downloaded on {download.downloadedAt ? formatDate(download.downloadedAt) : formatDate(new Date())}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
                              Download
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Download className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No downloads yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Your download history will appear here after you download content.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}