import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, Image, Download, Clock } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { PackagePurchaseModal } from "@/components/PackagePurchaseModal";
import { FirstDownloadInfoModal } from "@/components/FirstDownloadInfoModal";
import type { ContentItem, Download as DownloadType } from "@shared/schema";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  videos: ContentItem[];
  headshots: ContentItem[];
  totalItems: number;
}

export default function ProjectDetail() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/project/:projectId");
  const [isPackagePurchaseModalOpen, setIsPackagePurchaseModalOpen] = useState(false);
  const [isFirstDownloadInfoModalOpen, setIsFirstDownloadInfoModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ id: string; title: string } | null>(null);

  if (!match || !params?.projectId) {
    return <div>Project not found</div>;
  }

  const { data: allContent = [] } = useQuery<ContentItem[]>({
    queryKey: ["/api/content"],
    enabled: isAuthenticated,
  });

  const { data: freeSelections = [] } = useQuery({
    queryKey: ["/api/content/selections"],
    enabled: isAuthenticated,
  });

  const { data: downloadHistory = [] } = useQuery<DownloadType[]>({
    queryKey: ["/api/downloads/history"],
    enabled: isAuthenticated,
  });

  // Group content into projects (batches of 12)
  const projects: Project[] = [];
  const sortedContent = [...allContent].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  
  for (let i = 0; i < sortedContent.length; i += 12) {
    const batch = sortedContent.slice(i, i + 12);
    const videos = batch.filter(item => item.type === 'video');
    const headshots = batch.filter(item => item.type === 'headshot');
    
    projects.push({
      id: `project-${Math.floor(i / 12) + 1}`,
      name: `Project ${Math.floor(i / 12) + 1}`,
      createdAt: batch[0]?.createdAt?.toString() || new Date().toISOString(),
      videos,
      headshots,
      totalItems: batch.length,
    });
  }

  const selectedProject = projects.find(p => p.id === params.projectId);

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    window.location.href = "/";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '$0.00';
    return `$${parseFloat(price).toFixed(2)}`;
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
                <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
                <p className="text-muted-foreground">
                  {formatDate(selectedProject.createdAt)} • {selectedProject.totalItems} items
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg py-2 px-4">
              {selectedProject.videos.length} Videos • {selectedProject.headshots.length} Headshots
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="videos">
              <Video className="w-4 h-4 mr-2" />
              Videos ({selectedProject.videos.length})
            </TabsTrigger>
            <TabsTrigger value="headshots">
              <Image className="w-4 h-4 mr-2" />
              Headshots ({selectedProject.headshots.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {selectedProject.videos.map((video) => (
                <ContentCard
                  key={video.id}
                  content={video}
                  freeSelections={freeSelections}
                  downloadHistory={downloadHistory}
                  user={user}
                  onPackagePurchase={() => setIsPackagePurchaseModalOpen(true)}
                  onFirstDownload={(contentId, title) => {
                    setPendingDownload({ id: contentId, title });
                    setIsFirstDownloadInfoModalOpen(true);
                  }}
                />
              ))}
            </div>
            {selectedProject.videos.length === 0 && (
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
              {selectedProject.headshots.map((headshot) => (
                <ContentCard
                  key={headshot.id}
                  content={headshot}
                  freeSelections={freeSelections}
                  downloadHistory={downloadHistory}
                  user={user}
                  onPackagePurchase={() => setIsPackagePurchaseModalOpen(true)}
                  onFirstDownload={(contentId, title) => {
                    setPendingDownload({ id: contentId, title });
                    setIsFirstDownloadInfoModalOpen(true);
                  }}
                />
              ))}
            </div>
            {selectedProject.headshots.length === 0 && (
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
      <PackagePurchaseModal
        isOpen={isPackagePurchaseModalOpen}
        onClose={() => setIsPackagePurchaseModalOpen(false)}
        onSuccess={() => {
          setIsPackagePurchaseModalOpen(false);
          // Refresh queries to get updated user data
        }}
        freeSelectionsUsed={freeSelections.length}
        totalVideos={allContent.filter(item => item.type === 'video').length}
        totalHeadshots={allContent.filter(item => item.type === 'headshot').length}
        userPackages={{
          hasAdditional3Videos: user?.hasAdditional3Videos || false,
          hasAllRemainingContent: user?.hasAllRemainingContent || false,
        }}
      />

      <FirstDownloadInfoModal
        isOpen={isFirstDownloadInfoModalOpen}
        onClose={() => setIsFirstDownloadInfoModalOpen(false)}
        contentId={pendingDownload?.id || ""}
        contentTitle={pendingDownload?.title || ""}
      />
    </div>
  );
}