import React from "react"
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Video, Image, Download, Clock, Package, UserCheck } from "lucide-react";
import { ContentCard } from "../components/ContentCard";
import { ProjectPricingModal } from "../components/ProjectPricingModal";
import { FirstDownloadInfoModal } from "../components/FirstDownloadInfoModal";
import { ProjectReassignDialog } from "../components/ProjectReassignDialog";
import type { ContentItem, Download as DownloadType, Project, ProjectSelection } from "@shared/schema";

export default function ProjectDetail() {
  // Set document title for debugging
  if (typeof window !== 'undefined') {
    document.title = 'PROJECT DETAIL LOADED - ' + window.location.pathname;
  }
  
  console.log('=== PROJECT DETAIL COMPONENT MOUNTED ===');
  console.log('Current URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);
  
  const { user, isAuthenticated } = useAuth();
  console.log('Auth status:', { isAuthenticated, userId: user?.id, hasUser: !!user });
  
  const { toast } = useToast();
  const [match, params] = useRoute("/project/:projectId");
  console.log('Route match:', { match, params });
  
  const [isProjectPricingModalOpen, setIsProjectPricingModalOpen] = useState(false);
  const [isFirstDownloadInfoModalOpen, setIsFirstDownloadInfoModalOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ id: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  if (!match || !params) {
    return <div>Project not found</div>;
  }

  const projectId = (params as { projectId: string }).projectId;

  // Get project details
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isAuthenticated,
  });
  
  console.log('Project query:', { 
    project: project?.name, 
    projectLoading, 
    projectError: projectError?.message,
    enabled: isAuthenticated 
  });

  // Get project content
  const { data: projectContent = [], isLoading: contentLoading } = useQuery<ContentItem[]>({
    queryKey: [`/api/projects/${projectId}/content`],
    enabled: isAuthenticated,
  });

  // Get project selections
  const { data: projectSelections = [], isLoading: selectionsLoading } = useQuery<ProjectSelection[]>({
    queryKey: [`/api/projects/${projectId}/selections`],
    enabled: isAuthenticated,
  });

  const { data: downloadHistory = [] } = useQuery<DownloadType[]>({
    queryKey: ["/api/downloads/history"],
    enabled: isAuthenticated,
  });

  // Check package access
  const { data: hasAllContentAccess = false } = useQuery({
    queryKey: [`/api/projects/${projectId}/package-access/all_content`],
    enabled: isAuthenticated,
    select: (data: { hasAccess: boolean }) => data.hasAccess,
  });

  const { data: hasAdditional3VideosAccess = false } = useQuery({
    queryKey: [`/api/projects/${projectId}/package-access/additional_3_videos`],
    enabled: isAuthenticated,
    select: (data: { hasAccess: boolean }) => data.hasAccess,
  });

  if (projectLoading || contentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    console.log('=== PROJECT NOT FOUND - SHOWING ERROR PAGE ===');
    console.log('Project loading:', projectLoading);
    console.log('Project error:', projectError);
    console.log('Is authenticated:', isAuthenticated);
    console.log('Project query enabled:', isAuthenticated);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            Debug info: Loading={projectLoading ? 'true' : 'false'}, 
            Auth={isAuthenticated ? 'true' : 'false'}, 
            Error={projectError?.message || 'none'}
          </p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const videos = projectContent.filter(item => item.type === 'video');
  const headshots = projectContent.filter(item => item.type === 'headshot');
  const freeSelectionsUsed = projectSelections.filter(s => s.selectionType === 'free').length;
  const freeVideosRemaining = Math.max(0, (project.freeVideoLimit || 3) - freeSelectionsUsed);

  const handleBackToDashboard = () => {
    console.log('🔄 Manual back to dashboard button clicked');
    window.location.href = "/";
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getContentAccess = (contentItem: ContentItem) => {
    const isSelected = projectSelections.some(s => s.contentItemId === contentItem.id);
    const hasBeenDownloaded = downloadHistory.some(d => d.contentItemId === contentItem.id);
    const canSelectFree = freeVideosRemaining > 0 && contentItem.type === 'video' && !isSelected;
    
    // Check if user has package access that covers this content
    const hasPackageAccess = hasAllContentAccess || 
      (hasAdditional3VideosAccess && contentItem.type === 'video');
    
    // Debug logging to track access changes
    if (typeof contentItem.id === 'string' && contentItem.id === 'content-1753131071593-hs0p4qxez') { // Log for first video to track changes
      console.log('🔍 Access check for video:', {
        contentId: contentItem.id,
        isSelected,
        hasAllContentAccess,
        hasAdditional3VideosAccess,
        hasPackageAccess,
        finalHasAccess: isSelected || hasPackageAccess
      });
    }
    
    return {
      hasAccess: isSelected || hasPackageAccess,
      hasBeenDownloaded,
      canSelectFree,
      isFree: isSelected && projectSelections.find(s => s.contentItemId === contentItem.id)?.selectionType === 'free',
    };
  };

  const handleActualDownload = async (contentId: number) => {
    try {
      const response = await apiRequest('POST', `/api/content/${contentId}/download`);
      const data = await response.json();
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your file is downloading now",
      });

      // Refresh download history to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/downloads/history"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/selections`] });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download content",
        variant: "destructive",
      });
    }
  };

  const handleSuccessfulPurchase = () => {
    console.log('🎉 Successful purchase - refreshing all queries');
    setIsProjectPricingModalOpen(false);
    
    // Force refresh of ALL relevant queries to ensure UI updates
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/selections`] });  
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/content`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/package-access/additional_3_videos`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/package-access/all_content`] });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] }); // Refresh user data
    queryClient.invalidateQueries({ queryKey: ['/api/downloads/history'] });
    
    // Force a refetch immediately 
    setTimeout(() => {
      console.log('🔄 Force refetching package access queries');
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/package-access/additional_3_videos`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/package-access/all_content`] });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToDashboard}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground">
                  {formatDate(project.createdAt)} • {projectContent.length} items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg py-2 px-4">
                {videos.length} Videos • {headshots.length} Headshots
              </Badge>
              {(user as any)?.isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => setIsReassignDialogOpen(true)}
                  className="border-amber-200 hover:bg-amber-50 text-amber-700"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Reassign Project
                </Button>
              )}
              <Button 
                onClick={() => setIsProjectPricingModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Package className="w-4 h-4 mr-2" />
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Project Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Video className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold text-lg">{videos.length}</h3>
                <p className="text-muted-foreground">Videos</p>
              </div>
              <div className="text-center">
                <Image className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-semibold text-lg">{headshots.length}</h3>
                <p className="text-muted-foreground">Headshots</p>
              </div>
              <div className="text-center">
                <Download className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold text-lg">{freeSelectionsUsed}</h3>
                <p className="text-muted-foreground">Free Selections Used</p>
              </div>
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <h3 className="font-semibold text-lg">{freeVideosRemaining}</h3>
                <p className="text-muted-foreground">Free Downloads Left</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="videos">
              <Video className="w-4 h-4 mr-2" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="headshots">
              <Image className="w-4 h-4 mr-2" />
              Headshots ({headshots.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => {
                const access = getContentAccess(video);
                return (
                  <ContentCard
                    key={video.id}
                    content={video}
                    isFree={access.isFree}
                    hasAccess={access.hasAccess}
                    canSelectFree={access.canSelectFree}
                    hasBeenDownloaded={access.hasBeenDownloaded}
                    showPackageOptionsInstead={!access.hasAccess && !access.canSelectFree}
                    onShowPackageOptions={() => setIsProjectPricingModalOpen(true)}
                    // Only show FirstDownloadInfoModal for users who can select free content
                    onFirstDownloadAttempt={access.canSelectFree ? (contentId, title) => {
                      setPendingDownload({ id: contentId, title });
                      setIsFirstDownloadInfoModalOpen(true);
                    } : undefined}
                  />
                );
              })}
            </div>
            {videos.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No videos in this project</h3>
                  <p className="text-muted-foreground">Videos will appear here when they're uploaded.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="headshots">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {headshots.map((headshot) => {
                const access = getContentAccess(headshot);
                return (
                  <ContentCard
                    key={headshot.id}
                    content={headshot}
                    isFree={access.isFree}
                    hasAccess={access.hasAccess}
                    canSelectFree={false} // Headshots are never free in project pricing
                    hasBeenDownloaded={access.hasBeenDownloaded}
                    isCompact={true}
                    showPackageOptionsInstead={!access.hasAccess}
                    onShowPackageOptions={() => setIsProjectPricingModalOpen(true)}
                    // Headshots never trigger FirstDownloadInfoModal since they're never free
                    onFirstDownloadAttempt={undefined}
                  />
                );
              })}
            </div>
            {headshots.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No headshots in this project</h3>
                  <p className="text-muted-foreground">Headshots will appear here when they're uploaded.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ProjectPricingModal
        isOpen={isProjectPricingModalOpen}
        onClose={() => setIsProjectPricingModalOpen(false)}
        onSuccess={handleSuccessfulPurchase}
        project={project}
        projectContent={projectContent}
        freeSelectionsUsed={freeSelectionsUsed}
      />

      <FirstDownloadInfoModal
        isOpen={isFirstDownloadInfoModalOpen}
        onClose={() => {
          setIsFirstDownloadInfoModalOpen(false);
          setPendingDownload(null);
        }}
        onProceed={async () => {
          console.log('🔥 Proceed with Download clicked!', { pendingDownload });
          if (pendingDownload) {
            try {
              console.log('🔥 Making API request to select free video:', pendingDownload.id);
              // First, select the video as free
              const response = await apiRequest('POST', `/api/content/${pendingDownload.id}/select-free`);
              console.log('🔥 API Response status:', response.status);
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error('🔥 API Error:', errorData);
                throw new Error(errorData.message || `HTTP ${response.status}`);
              }
              
              console.log('🔥 Selection successful, refreshing queries');
              // Refresh selections to update the UI
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/selections`] });
              
              setIsFirstDownloadInfoModalOpen(false);
              setPendingDownload(null);
              
              toast({
                title: "Video Selected",
                description: "This video has been added to your free selections. You can now download it.",
              });
              console.log('🔥 Process completed successfully');
            } catch (error: any) {
              console.error('🔥 Selection error:', error);
              toast({
                title: "Selection Failed",
                description: error.message || "Failed to select video",
                variant: "destructive",
              });
            }
          } else {
            console.error('🔥 No pending download found!');
          }
        }}
        onPurchasePackage={(packageType) => {
          console.log('📦 Package purchase clicked:', packageType);
          setIsFirstDownloadInfoModalOpen(false);
          setIsProjectPricingModalOpen(true);
          setPendingDownload(null);
        }}
        videoTitle={pendingDownload?.title || ""}
        remainingFreeVideos={freeVideosRemaining}
      />

      <ProjectReassignDialog
        isOpen={isReassignDialogOpen}
        onClose={() => setIsReassignDialogOpen(false)}
        projectId={projectId}
        projectName={project?.name || ""}
        currentUserId={project?.userId || ""}
      />
    </div>
  );
}