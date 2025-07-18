import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Package, Video } from "lucide-react";

interface FirstDownloadInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  videoTitle: string;
  remainingFreeVideos: number;
}

export function FirstDownloadInfoModal({
  isOpen,
  onClose,
  onProceed,
  videoTitle,
  remainingFreeVideos
}: FirstDownloadInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            Before You Download: Understanding Your Options
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Download Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">You're about to download: {videoTitle}</span>
            </div>
            <p className="text-blue-800 text-sm">
              This will use 1 of your {remainingFreeVideos} remaining free video downloads.
            </p>
          </div>

          {/* How It Works Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">How Your Content Access Works</h3>
              <p className="text-gray-600">
                Get started with your complimentary content, then choose the package that best fits your needs.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
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
                  {3 - remainingFreeVideos}/3 videos selected
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
                  Your content, your files
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Package Details
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">3 Additional Videos</h5>
                  <Badge className="bg-blue-100 text-blue-800">$199</Badge>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    3 more video downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    High quality files
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Instant access
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">All Remaining Content</h5>
                  <Badge className="bg-green-100 text-green-800">$499</Badge>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    All remaining videos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Professional headshots
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Complete content library
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Important to Know:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• You can only select 3 videos for free - choose wisely!</li>
              <li>• Once you've used your free selections, you'll need a package for more content</li>
              <li>• All downloads are yours to keep forever</li>
              <li>• Headshots are only available with the $499 package</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Let Me Choose Different Videos
          </Button>
          <Button
            onClick={onProceed}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Proceed with Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}