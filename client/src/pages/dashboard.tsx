import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ContentCard } from "@/components/ContentCard";
import { PackagePurchaseModal } from "@/components/PackagePurchaseModal";
import { FirstDownloadInfoModal } from "@/components/FirstDownloadInfoModal";

import { Download, Lock, Video, Image, Clock, Settings, LogOut } from "lucide-react";
import type { ContentItem, Download as DownloadType } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isPackagePurchaseModalOpen, setIsPackagePurchaseModalOpen] = useState(false);
  const [isFirstDownloadInfoModalOpen, setIsFirstDownloadInfoModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ id: string; title: string } | null>(null);


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

  const { data: allContent = [], isLoading: contentLoading } = useQuery({
    queryKey: ["/api/content"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      }
    },
  });

  const { data: freeSelections = [], isLoading: selectionsLoading } = useQuery({
    queryKey: ["/api/content/selections"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      }
    },
  });

  const { data: downloadHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/downloads/history"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      }
    },
  });

  // Get selected content IDs for quick lookup
  const selectedContentIds = new Set(freeSelections.map(selection => selection.contentItemId));
  const downloadedContentIds = new Set(downloadHistory.map(download => download.contentItemId));
  
  // Separate content by type
  const videos = allContent.filter((item: ContentItem) => item.type === "video");
  const headshots = allContent.filter((item: ContentItem) => item.type === "headshot");
  
  // Count free selections used
  const freeVideoSelections = freeSelections.filter(s => {
    const content = allContent.find(c => c.id === s.contentItemId);
    return content?.type === "video";
  });
  const freeHeadshotSelections = freeSelections.filter(s => {
    const content = allContent.find(c => c.id === s.contentItemId);
    return content?.type === "headshot";
  });

  // Helper function to determine if user has access to content
  const hasContentAccess = (contentItem: ContentItem): boolean => {
    // Free selections always have access
    if (selectedContentIds.has(contentItem.id)) return true;
    
    // If user has all remaining content package, they have access to everything
    if (user?.hasAllRemainingContent) return true;
    
    // If user has additional 3 videos package, they have access to videos (but not headshots)
    if (user?.hasAdditional3Videos && contentItem.type === "video") return true;
    
    return false;
  };

  // Handle first download attempt
  const handleFirstDownloadAttempt = (contentId: string, title: string) => {
    // Check if this is the first download attempt (no downloads yet)
    if (downloadHistory.length === 0) {
      setPendingDownload({ id: contentId, title });
      setIsFirstDownloadInfoModalOpen(true);
    } else {
      // Proceed with normal download flow
      handleDownload(contentId);
    }
  };

  // Handle the actual download
  const handleDownload = async (contentId: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/download`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-${contentId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your content is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || contentLoading || selectionsLoading || historyLoading) {
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
                  onClick={() => window.location.href = '/admin'}
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
                onClick={() => window.location.href = '/api/logout'}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-blue-100">
                Your podcast session content is ready for download
              </p>
            </div>
            <div className="hidden md:flex space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{freeVideoSelections.length}/3</div>
                <div className="text-sm text-blue-100">Free Videos Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{allContent.length}</div>
                <div className="text-sm text-blue-100">Total Content Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{downloadHistory.length}</div>
                <div className="text-sm text-blue-100">Downloads Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Overview */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">How Your Content Access Works</h3>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              Get started with your complimentary content, then choose the package that best fits your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Free Selection</h4>
              <p className="text-gray-600 mb-4">
                Choose up to <strong>3 videos</strong> for complimentary download.
              </p>
              <div className="text-sm text-blue-600 font-medium">
                {freeVideoSelections.length}/3 videos selected
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Package Options</h4>
              <p className="text-gray-600 mb-4">
                After your free selections, choose from our packages:
              </p>
              <div className="text-sm space-y-1">
                <div className="text-green-600 font-medium">3 Additional Videos - $199</div>
                <div className="text-green-600 font-medium">All Remaining Content + Headshots - $499</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Download & Keep</h4>
              <p className="text-gray-600 mb-4">
                All content is yours to download and keep forever in high quality.
              </p>
              <div className="text-sm text-purple-600 font-medium">
                {downloadHistory.length} downloads completed
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h4 className="text-lg font-semibold text-gray-900">Your Current Status</h4>
                <p className="text-gray-600">
                  {freeVideoSelections.length === 0 && 
                    "Start by selecting your 3 free videos below"}
                  {freeVideoSelections.length > 0 && freeVideoSelections.length < 3 && 
                    `Keep selecting free videos (${3 - freeVideoSelections.length} remaining)`}
                  {freeVideoSelections.length === 3 && 
                    !user?.hasAdditional3Videos && !user?.hasAllRemainingContent && 
                    "Ready to explore packages for additional content"}
                  {user?.hasAdditional3Videos && !user?.hasAllRemainingContent && 
                    "You have access to 3 additional videos"}
                  {user?.hasAllRemainingContent && 
                    "You have access to all remaining content"}
                </p>
              </div>
              <div className="flex space-x-4">
                {user?.hasAdditional3Videos && (
                  <Badge className="bg-blue-100 text-blue-800">3 Additional Videos</Badge>
                )}
                {user?.hasAllRemainingContent && (
                  <Badge className="bg-green-100 text-green-800">All Content Access</Badge>
                )}
                {!user?.hasAdditional3Videos && !user?.hasAllRemainingContent && 
                  freeVideoSelections.length === 3 && (
                  <Button 
                    onClick={() => setIsPackagePurchaseModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    View Packages
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Video Content Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Video Podcast Content</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {freeVideoSelections.length}/3 Free Selected
            </Badge>
          </div>
          
          {contentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-32 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-3"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {videos.map((item: ContentItem) => (
                <ContentCard 
                  key={item.id} 
                  content={item} 
                  isFree={selectedContentIds.has(item.id)}
                  hasAccess={hasContentAccess(item)}
                  canSelectFree={freeVideoSelections.length < 3 && !selectedContentIds.has(item.id)}
                  hasBeenDownloaded={downloadedContentIds.has(item.id)}
                  onFirstDownloadAttempt={downloadHistory.length === 0 ? handleFirstDownloadAttempt : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Headshots Content Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Professional Headshots</h3>
            <Badge className="bg-orange-100 text-orange-800">
              Premium Content
            </Badge>
          </div>
          
          {contentLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-32 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-3"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {headshots.map((item: ContentItem) => (
                <ContentCard 
                  key={item.id} 
                  content={item} 
                  isFree={false}
                  hasAccess={hasContentAccess(item)}
                  canSelectFree={false}
                  hasBeenDownloaded={downloadedContentIds.has(item.id)}
                  isCompact={true}
                  onFirstDownloadAttempt={downloadHistory.length === 0 ? handleFirstDownloadAttempt : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Instructions */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Select up to 3 videos for free download. 
                Then choose a package to access additional content.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <Video className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Step 1: Select Free Videos</h4>
                  <p className="text-sm text-gray-600">Choose up to 3 videos for complimentary download</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <Download className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Step 2: Purchase More</h4>
                  <p className="text-sm text-gray-600">Buy additional content with our packages</p>
                </div>
              </div>
            </div>

            {/* Package Purchase Button */}
            {freeVideoSelections.length === 3 && (
              <div className="mt-8 text-center">
                <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Ready for More Content?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    You've selected your 3 free videos. Choose a package to access additional content.
                  </p>
                  <Button 
                    onClick={() => setIsPackagePurchaseModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    View Packages
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Download History */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Download History</h3>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-gray-600">Recent Downloads</CardTitle>
                <span className="text-sm text-gray-600">
                  {downloadHistory.length} downloads
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-300 rounded mr-3"></div>
                        <div>
                          <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : downloadHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No downloads yet. Start downloading your content!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {downloadHistory.map((download: DownloadType & { contentItem: ContentItem }) => (
                    <div key={download.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center">
                        {download.contentItem.type === "video" ? (
                          <Video className="w-5 h-5 text-primary mr-3" />
                        ) : (
                          <Image className="w-5 h-5 text-primary mr-3" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{download.contentItem.title}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(download.downloadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(download.contentItem.fileUrl, '_blank')}
                      >
                        Re-download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Package Purchase Modal */}
      <PackagePurchaseModal 
        isOpen={isPackagePurchaseModalOpen} 
        onClose={() => setIsPackagePurchaseModalOpen(false)}
        onSuccess={() => {
          // Refresh data when purchase is successful
          window.location.reload();
        }}
        freeSelectionsUsed={freeVideoSelections.length}
        totalVideos={videos.length}
        totalHeadshots={headshots.length}
        userPackages={{
          hasAdditional3Videos: user?.hasAdditional3Videos || false,
          hasAllRemainingContent: user?.hasAllRemainingContent || false,
        }}
      />
      
      {/* First Download Info Modal */}
      <FirstDownloadInfoModal
        isOpen={isFirstDownloadInfoModalOpen}
        onClose={() => {
          setIsFirstDownloadInfoModalOpen(false);
          setPendingDownload(null);
        }}
        onProceed={() => {
          if (pendingDownload) {
            handleDownload(pendingDownload.id);
          }
          setIsFirstDownloadInfoModalOpen(false);
          setPendingDownload(null);
        }}
        videoTitle={pendingDownload?.title || ""}
        remainingFreeVideos={3 - freeVideoSelections.length}
      />
    </div>
  );
}
