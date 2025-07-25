import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X, Download } from "lucide-react";
import { ContentItem } from "@shared/schema";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: ContentItem | null;
  hasAccess: boolean;
  onDownload?: () => void;
  onSelectFree?: () => void;
  canSelectFree?: boolean;
}

export function VideoPreviewModal({
  isOpen,
  onClose,
  video,
  hasAccess,
  onDownload,
  onSelectFree,
  canSelectFree
}: VideoPreviewModalProps) {
  console.log('VideoPreviewModal props:', { isOpen, video: video?.title, hasAccess, canSelectFree });
  
  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{video.title}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Player */}
          <div 
            className="bg-black rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: video.aspectRatio ? parseFloat(video.aspectRatio.toString()) : 16/9,
              maxHeight: '70vh',
              maxWidth: '100%'
            }}
          >
            <video
              controls
              className="w-full h-full object-contain"
              poster={video.thumbnailUrl || undefined}
            >
              <source src={video.fileUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video Details */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{video.title}</h3>
              {video.description && (
                <p className="text-muted-foreground mt-1">{video.description}</p>
              )}
            </div>

            {video.duration && (
              <div className="text-sm text-muted-foreground">
                Duration: {video.duration}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {hasAccess ? (
                <Button onClick={onDownload} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Video
                </Button>
              ) : (
                <div className="flex gap-3">
                  {canSelectFree && onSelectFree && (
                    <Button 
                      onClick={onSelectFree}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      Select as Free Content
                    </Button>
                  )}
                  <Button className="flex items-center gap-2">
                    Purchase for ${video.price}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}