import React from "react"
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { isUnauthorizedError } from "../lib/authUtils";
import { Download, Lock, Play, Image, Clock, Video, Package } from "lucide-react";
import type { ContentItem } from "@shared/schema";
import { VideoPreviewModal } from "./VideoPreviewModal";

interface ContentCardProps {
  content: ContentItem;
  isFree: boolean;
  hasAccess?: boolean;
  canSelectFree?: boolean;
  hasBeenDownloaded?: boolean;
  isCompact?: boolean;
  onFirstDownloadAttempt?: (contentId: string, title: string) => void;
  showPackageOptionsInstead?: boolean;
  onShowPackageOptions?: () => void;
}

export function ContentCard({ content, isFree, hasAccess = false, canSelectFree = false, hasBeenDownloaded = false, isCompact = false, onFirstDownloadAttempt, showPackageOptionsInstead = false, onShowPackageOptions }: ContentCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const selectFreeMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/content/${contentId}/select-free`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Selected",
        description: "This content has been added to your free selections",
      });
      // Invalidate all queries that might show project selections
      queryClient.invalidateQueries({ queryKey: ["/api/content/selections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${content.projectId}/selections`] });
    },
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
      } else if (error.message.includes("maximum number of free videos")) {
        // User has reached free video limit, show package options
        if (onShowPackageOptions) {
          onShowPackageOptions();
        } else {
          toast({
            title: "Free Limit Reached",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Selection Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/content/${contentId}/download`);
      return response.json();
    },
    onSuccess: (data) => {
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

      // Invalidate download history to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/downloads/history"] });
    },
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
      } else {
        toast({
          title: "Download Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleSelectFree = () => {
    // If this is a first download attempt and callback is provided, show the modal first
    if (onFirstDownloadAttempt) {
      onFirstDownloadAttempt(content.id.toString(), content.title);
      return;
    }
    
    // Otherwise, directly select the content
    selectFreeMutation.mutate(content.id);
  };

  const handleDownload = async () => {
    // If this is a first download attempt and callback is provided, use it
    if (onFirstDownloadAttempt) {
      onFirstDownloadAttempt(content.id.toString(), content.title);
      return;
    }
    
    setIsDownloading(true);
    try {
      downloadMutation.mutate(content.id);
    } finally {
      setIsDownloading(false);
    }
  };



  // Calculate dynamic container style based on aspect ratio
  const getContainerStyle = () => {
    if (content.type !== "video" || !content.aspectRatio) {
      // Default dimensions for non-videos or videos without aspect ratio data
      return { 
        width: '100%',
        height: isCompact ? '96px' : '128px'
      };
    }

    const aspectRatio = parseFloat(content.aspectRatio.toString());
    
    // For vertical videos (aspect ratio < 1), create a taller container
    // For horizontal videos (aspect ratio > 1), use full width
    if (aspectRatio < 1) {
      // Vertical video - fixed width, auto height
      return { 
        width: isCompact ? '120px' : '180px',
        height: 'auto',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else {
      // Horizontal video - full width
      return { 
        width: '100%',
        height: isCompact ? '96px' : '128px'
      };
    }
  };

  const canDownload = hasAccess;
  const isLocked = !canDownload;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 ${isLocked ? 'relative' : ''}`}>
      <div className="relative">
        <div 
          className={`overflow-hidden ${content.type === "video" ? 'cursor-pointer' : ''} bg-gray-100 flex items-center justify-center`}
          style={getContainerStyle()}
          onClick={content.type === "video" ? () => {
            console.log('Thumbnail clicked, opening preview for:', content.title);
            setShowVideoPreview(true);
          } : undefined}
        >
          {content.thumbnailUrl || (content.type === "headshot" && content.fileUrl) ? (
            <img 
              src={content.thumbnailUrl || content.fileUrl} 
              alt={content.title} 
              className="max-w-full max-h-full object-contain"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              {content.type === "video" ? (
                <Video className="w-8 h-8 text-gray-400" />
              ) : (
                <Image className="w-8 h-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Overlay for videos */}
        {content.type === "video" && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer hover:bg-opacity-50 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Play button clicked for:', content.title);
              setShowVideoPreview(true);
            }}
          >
            <div className="bg-white bg-opacity-90 rounded-full p-3">
              <Play className="text-black text-xl" fill="currentColor" />
            </div>
          </div>
        )}



        {/* Duration badge for videos */}
        {content.type === "video" && content.duration && (
          <Badge 
            className={`absolute top-2 right-2 ${isFree ? 'bg-green-500' : 'bg-orange-500'} text-white text-xs`}
          >
            {content.duration}
          </Badge>
        )}

        {/* File type badge for images */}
        {content.type === "headshot" && (
          <Badge className="absolute top-2 right-2 bg-blue-500 text-white text-xs">
            JPG
          </Badge>
        )}
      </div>

      <CardContent className={`${isCompact ? 'p-2' : 'p-4'}`}>
        <h4 className={`font-semibold text-gray-900 mb-2 ${isCompact ? 'text-sm' : ''}`}>
          {content.title}
        </h4>
        
        {!isCompact && content.description && (
          <p className="text-sm text-gray-600 mb-3">{content.description}</p>
        )}

        {isCompact && (
          <p className="text-xs text-gray-600 text-center mb-2">
            {content.type === "headshot" ? "Professional Photo" : "Video Content"}
          </p>
        )}

        {canDownload ? (
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            onClick={handleDownload}
            disabled={isDownloading || downloadMutation.isPending}
          >
            {isDownloading || downloadMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {hasBeenDownloaded ? 
                  `Download ${content.type === "video" ? "Video" : "Image"}` :
                  "Confirm Download"
                }
              </>
            )}
          </Button>
        ) : canSelectFree ? (
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            onClick={handleSelectFree}
            disabled={selectFreeMutation.isPending}
          >
            {selectFreeMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Selecting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Free {content.type === "video" ? "Video" : "Image"}
              </>
            )}
          </Button>
        ) : showPackageOptionsInstead ? (
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            onClick={onShowPackageOptions}
          >
            <Package className="w-4 h-4 mr-2" />
            View Packages
          </Button>
        ) : (
          <Button
            className="w-full bg-gray-300 text-gray-600 cursor-not-allowed font-medium py-2 px-4 rounded-md"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Content Locked
          </Button>
        )}
      </CardContent>

      {/* Video Preview Modal */}
      {content.type === "video" && (
        <VideoPreviewModal
          isOpen={showVideoPreview}
          onClose={() => setShowVideoPreview(false)}
          video={content}
          hasAccess={canDownload}
          onDownload={handleDownload}
          onSelectFree={canSelectFree ? handleSelectFree : undefined}
          canSelectFree={canSelectFree}
        />
      )}
    </Card>
  );
}
