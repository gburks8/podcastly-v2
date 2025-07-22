import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, Users, Video, Image, Trash2, X, FileVideo, CheckCircle, FolderOpen, Calendar, Package, ExternalLink, Edit2, Plus, Send, Eye, Copy, Link } from "lucide-react";
import type { User, ContentItem, Project } from "@shared/schema";

// Project Management Tab Component
function ProjectManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: projectsLoading } = useQuery<(Project & { user: User; contentCount: number })[]>({
    queryKey: ["/api/admin/projects"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const [selectedProject, setSelectedProject] = useState<(Project & { user: User; contentCount: number }) | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isProjectManageDialogOpen, setIsProjectManageDialogOpen] = useState(false);

  const reassignMutation = useMutation({
    mutationFn: async ({ projectId, newUserId }: { projectId: string; newUserId: string }) => {
      const response = await fetch(`/api/projects/${projectId}/reassign`, {
        method: "PUT",
        body: JSON.stringify({ newUserId }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reassign project: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project reassigned successfully",
        description: "The project has been transferred to the new user",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      setSelectedProject(null);
      setIsReassignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reassign project",
        description: error.message || "An error occurred while reassigning the project",
        variant: "destructive",
      });
    },
  });

  if (projectsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Project Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2 mb-3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Project Management ({projects.length} projects)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => {
                setSelectedProject(project);
                setIsProjectManageDialogOpen(true);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Users className="w-4 h-4" />
                    <span>{project.user.firstName} {project.user.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/project/${project.id}`, '_blank');
                    }}
                    className="shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Package className="w-3 h-3 mr-1" />
                    {project.contentCount} items
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No projects created yet</p>
              <p className="text-sm">Projects will appear here after content uploads</p>
            </div>
          )}
        </div>

        {/* Project Management Dialog */}
        {selectedProject && (
          <ProjectManagementDialog
            isOpen={isProjectManageDialogOpen}
            onClose={() => {
              setIsProjectManageDialogOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            users={users}
            onReassign={(newUserId) => {
              reassignMutation.mutate({
                projectId: selectedProject.id,
                newUserId,
              });
            }}
            isReassigning={reassignMutation.isPending}
            onOpenReassignDialog={() => {
              setIsProjectManageDialogOpen(false);
              setIsReassignDialogOpen(true);
            }}
          />
        )}

        {/* Project Reassignment Dialog */}
        {selectedProject && (
          <ProjectReassignDialog
            isOpen={isReassignDialogOpen}
            onClose={() => {
              setIsReassignDialogOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            users={users}
            onReassign={(newUserId) => {
              reassignMutation.mutate({
                projectId: selectedProject.id,
                newUserId,
              });
            }}
            isLoading={reassignMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Project Management Dialog Component
function ProjectManagementDialog({
  isOpen,
  onClose,
  project,
  users,
  onReassign,
  isReassigning,
  onOpenReassignDialog,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: Project & { user: User; contentCount: number };
  users: User[];
  onReassign: (newUserId: string) => void;
  isReassigning: boolean;
  onOpenReassignDialog: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projectContent = [], isLoading: contentLoading } = useQuery<ContentItem[]>({
    queryKey: ["/api/projects", project.id, "content"],
    enabled: isOpen,
  });

  const uploadSingleFile = async (fileData: typeof uploadQueue[0], index: number) => {
    try {
      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'uploading', progress: 0 } : item
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map((item, i) => {
          if (i === index && item.status === 'uploading' && item.progress < 90) {
            return { ...item, progress: Math.min(item.progress + Math.random() * 15, 90) };
          }
          return item;
        }));
      }, 500);

      const formData = new FormData();
      // Use correct field name based on file type
      const fieldName = fileData.type === 'video' ? 'video' : 'headshot';
      formData.append(fieldName, fileData.file);
      formData.append('title', fileData.title);
      formData.append('description', fileData.description);
      formData.append('type', fileData.type);
      formData.append('category', fileData.category);
      formData.append('userId', project.userId);
      formData.append('projectId', project.id);

      const response = await fetch("/api/admin/content", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Upload error:', errorText);
        throw new Error(errorText || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload success:', result);

      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'completed', progress: 100 } : item
      ));

      return result;
    } catch (error: any) {
      console.log('Upload error:', error);
      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'error', progress: 0 } : item
      ));
      throw error;
    }
  };

  const uploadAllFiles = async () => {
    const pendingItems = uploadQueue.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      toast({
        title: "No files to upload",
        description: "All files have already been processed",
        variant: "destructive",
      });
      return;
    }
    
    for (let i = 0; i < uploadQueue.length; i++) {
      if (uploadQueue[i].status === 'pending') {
        try {
          await uploadSingleFile(uploadQueue[i], i);
        } catch (error: any) {
          console.log('Batch upload error:', error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${uploadQueue[i].title}: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    }
    
    // Invalidate relevant queries to refresh the content
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/content`] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    
    toast({
      title: "Upload complete",
      description: "All files have been processed",
    });
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch(`/api/projects/${project.id}/name`, {
        method: "PUT",
        body: JSON.stringify({ name: newName }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update project name: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project name updated",
        description: "The project name has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      setIsEditingName(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update project name",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await fetch(`/api/admin/content/${contentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete content: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content deleted",
        description: "The content item has been removed from the project",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadContentMutation = useMutation({
    mutationFn: async (uploadItem: any) => {
      const formData = new FormData();
      // Use correct field name based on file type for multer
      const fieldName = uploadItem.type === 'video' ? 'video' : 'headshot';
      formData.append(fieldName, uploadItem.file);
      formData.append("title", uploadItem.title);
      formData.append("description", uploadItem.description);
      formData.append("type", uploadItem.type);
      formData.append("category", uploadItem.category);
      formData.append("userId", project.userId);
      formData.append("projectId", project.id);

      const response = await fetch("/api/admin/content", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleCopyProjectLink = async () => {
    // Create direct project URL - authentication and redirect handled automatically by Router
    const projectLink = `${window.location.origin}/project/${project.id}`;
    console.log('🔗 Generated project link:', projectLink);
    try {
      await navigator.clipboard.writeText(projectLink);
      toast({
        title: "Project link copied!",
        description: "Share this link with the client. They'll be taken directly to their project after login.",
      });
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = projectLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Project link copied!",
        description: "Share this link with the client. They'll be taken directly to their project after login.",
      });
    }
  };

  const handleUpdateName = () => {
    if (projectName.trim() && projectName !== project.name) {
      updateNameMutation.mutate(projectName.trim());
    } else {
      setIsEditingName(false);
      setProjectName(project.name);
    }
  };

  if (!isOpen) return null;

  const videos = projectContent.filter(item => item.type === "video");
  const headshots = projectContent.filter(item => item.type === "headshot");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="text-xl font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName();
                      if (e.key === 'Escape') {
                        setIsEditingName(false);
                        setProjectName(project.name);
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateName}
                    disabled={updateNameMutation.isPending}
                  >
                    {updateNameMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingName(false);
                      setProjectName(project.name);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{project.name}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{project.user.firstName} {project.user.lastName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span>{project.contentCount} items</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyProjectLink}
              >
                <Link className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/project/${project.id}`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Project
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenReassignDialog}
              >
                <Users className="w-4 h-4 mr-2" />
                Reassign
              </Button>
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b">
            <button
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === "overview" ? "border-primary text-primary" : "border-transparent"
              }`}
              onClick={() => setSelectedTab("overview")}
            >
              Overview
            </button>
            <button
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === "videos" ? "border-primary text-primary" : "border-transparent"
              }`}
              onClick={() => setSelectedTab("videos")}
            >
              Videos ({videos.length})
            </button>
            <button
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === "headshots" ? "border-primary text-primary" : "border-transparent"
              }`}
              onClick={() => setSelectedTab("headshots")}
            >
              Headshots ({headshots.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {contentLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                  <div className="w-16 h-16 bg-gray-300 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-8 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {selectedTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-5 h-5 text-blue-500" />
                          <h3 className="font-medium">Videos</h3>
                        </div>
                        <p className="text-2xl font-bold">{videos.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Image className="w-5 h-5 text-green-500" />
                          <h3 className="font-medium">Headshots</h3>
                        </div>
                        <p className="text-2xl font-bold">{headshots.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-purple-500" />
                          <h3 className="font-medium">Total Items</h3>
                        </div>
                        <p className="text-2xl font-bold">{project.contentCount}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Recent Uploads</h3>
                    <div className="space-y-2">
                      {projectContent.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            {item.type === "video" ? (
                              <Video className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Image className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "videos" && (
                <ContentGrid 
                  items={videos} 
                  onDelete={(id) => deleteContentMutation.mutate(id)}
                  isDeleting={deleteContentMutation.isPending}
                />
              )}

              {selectedTab === "headshots" && (
                <ContentGrid 
                  items={headshots} 
                  onDelete={(id) => deleteContentMutation.mutate(id)}
                  isDeleting={deleteContentMutation.isPending}
                />
              )}

              {/* Upload Interface */}
              {showUploadInterface && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="font-medium mb-4">Add Content to {project.name}</h4>
                  
                  {/* File Drop Zone */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer bg-white"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      
                      const files = Array.from(e.dataTransfer.files);
                      console.log('Files dropped:', files.length);
                      
                      const processedFiles = files.map(file => ({
                        id: Math.random().toString(36).substring(2, 15),
                        file,
                        name: file.name,
                        type: file.type.startsWith('video/') ? 'video' : 'headshot',
                        size: file.size,
                        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                        description: "",
                        category: "premium",
                      }));
                      
                      setUploadQueue(prev => [...prev, ...processedFiles]);
                    }}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
                    <p className="text-sm text-gray-500">Supports MP4, MOV, AVI videos and JPG, PNG images</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="video/*,image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        console.log('Files selected:', files.length);
                        
                        const processedFiles = files.map(file => ({
                          id: Math.random().toString(36).substring(2, 15),
                          file,
                          name: file.name,
                          type: file.type.startsWith('video/') ? 'video' : 'headshot',
                          size: file.size,
                          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                          description: "",
                          category: "premium",
                        }));
                        
                        setUploadQueue(prev => [...prev, ...processedFiles]);
                      }}
                      className="hidden"
                    />
                  </div>
                  
                  {uploadQueue.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-3">Upload Queue ({uploadQueue.length} files)</h5>
                      <div className="space-y-2">
                        {uploadQueue.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center gap-3">
                              <FileVideo className="w-5 h-5 text-gray-400" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setUploadQueue(queue => queue.filter((_, i) => i !== index));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          onClick={async () => {
                            if (uploadQueue.length === 0) return;

                            toast({
                              title: "Starting upload",
                              description: `Uploading ${uploadQueue.length} files to ${project.name}`,
                            });

                            try {
                              // Upload files sequentially using the existing mutation
                              for (const uploadItem of uploadQueue) {
                                await uploadContentMutation.mutateAsync(uploadItem);
                              }

                              toast({
                                title: "Upload complete",
                                description: `Successfully uploaded ${uploadQueue.length} files`,
                              });

                              // Clear upload queue and hide interface
                              setUploadQueue([]);
                              setShowUploadInterface(false);
                            } catch (error) {
                              console.error('Batch upload error:', error);
                            }
                          }}
                          disabled={uploadContentMutation.isPending || uploadQueue.length === 0}
                        >
                          {uploadContentMutation.isPending ? "Uploading..." : "Upload All Files"}
                        </Button>
                        <Button variant="outline" onClick={() => setUploadQueue([])}>
                          Clear Queue
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>


        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Last updated: {new Date(project.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('➕ Add Content clicked for project:', project.name);
                  setShowUploadInterface(!showUploadInterface);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {showUploadInterface ? 'Hide Upload' : 'Add Content'}
              </Button>
              <Button variant="outline" size="sm">
                <Send className="w-4 h-4 mr-2" />
                Resend Project
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Grid Component for displaying videos/headshots
function ContentGrid({ 
  items, 
  onDelete, 
  isDeleting 
}: { 
  items: ContentItem[];
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No {items.length === 0 ? "content" : "items"} found</p>
      </div>
    );
  }

  const handleItemClick = (item: ContentItem) => {
    if (item.type === "video" && item.fileUrl) {
      window.open(item.fileUrl, '_blank');
    } else if (item.type === "headshot" && item.fileUrl) {
      window.open(item.fileUrl, '_blank');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg overflow-hidden bg-white">
          {/* Thumbnail Container */}
          <div 
            className="relative cursor-pointer group"
            onClick={() => handleItemClick(item)}
          >
            {(item.thumbnailUrl || (item.type === "headshot" && item.fileUrl)) ? (
              <div className="flex justify-center bg-gray-50">
                <img
                  src={item.thumbnailUrl || item.fileUrl}
                  alt={item.title}
                  className="max-w-full h-auto object-contain"
                  style={{ 
                    maxHeight: '200px',
                    // Preserve aspect ratio - don't force vertical orientation
                    aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : 'auto'
                  }}
                />
              </div>
            ) : (
              <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center min-h-[180px]">
                {item.type === "video" ? (
                  <Video className="w-8 h-8 text-gray-400" />
                ) : (
                  <Image className="w-8 h-8 text-gray-400" />
                )}
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
          
          {/* Content Info */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm truncate flex-1">{item.title}</h4>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                disabled={isDeleting}
                className="ml-2 h-7 w-7 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex gap-1 mb-2">
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {item.type}
              </Badge>
            </div>
            
            {item.description && (
              <p className="text-xs text-gray-600 truncate">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Project Reassignment Dialog Component
function ProjectReassignDialog({
  isOpen,
  onClose,
  project,
  users,
  onReassign,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: Project & { user: User; contentCount: number };
  users: User[];
  onReassign: (newUserId: string) => void;
  isLoading: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");

  // Filter out the current owner from the list
  const availableUsers = users.filter(user => user.id !== project.userId);

  const handleReassign = () => {
    if (!selectedUserId) return;
    onReassign(selectedUserId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Reassign Project</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-medium mb-2">Project Details</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{project.name}</p>
              <p className="text-sm text-gray-600">
                Current Owner: {project.user.firstName} {project.user.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {project.contentCount} items • Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="newUser">Transfer to User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a new owner" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.profileImageUrl || ""} />
                        <AvatarFallback className="text-xs">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.firstName} {user.lastName} ({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReassign} 
            disabled={!selectedUserId || isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? "Reassigning..." : "Reassign Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<Array<{
    file: File;
    title: string;
    description: string;
    duration: string;
    price: string;
    userId: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [defaultPrice, setDefaultPrice] = useState("25.00");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const selectedUserRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: allContent = [], isLoading: contentLoading } = useQuery<ContentItem[]>({
    queryKey: ["/api/admin/content"],
    enabled: isAuthenticated,
  });

  // Debug state changes
  useEffect(() => {
    console.log('selectedUserId changed to:', selectedUserId);
  }, [selectedUserId]);
  
  useEffect(() => {
    console.log('users array changed, length:', users?.length);
    if (users.length > 0 && !selectedUserId) {
      console.log('Users loaded but no selection - keeping current state');
    }
  }, [users]);



  const deleteMutation = useMutation({
    mutationFn: async (contentId: number) => {
      await apiRequest("DELETE", `/api/admin/content/${contentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
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
          title: "Error",
          description: "Failed to delete content",
          variant: "destructive",
        });
      }
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter(file => 
      file.type.startsWith('video/') || 
      ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(file.name.split('.').pop()?.toLowerCase() || '')
    );
    
    if (videoFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please drop video files only",
        variant: "destructive",
      });
      return;
    }
    
    addFilesToQueue(videoFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files: File[]) => {
    const currentUserId = selectedUserRef.current || selectedUserId;
    console.log('Selected user ID (state):', selectedUserId);
    console.log('Selected user ID (ref):', selectedUserRef.current);
    console.log('Current user ID (using):', currentUserId);
    console.log('Users data:', users);
    
    if (!currentUserId || currentUserId.trim() === '') {
      toast({
        title: "No user selected",
        description: "Please select a user account before uploading files",
        variant: "destructive",
      });
      return;
    }

    const newItems = files.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      description: "",
      duration: "",
      price: defaultPrice,
      userId: selectedUserId,
      progress: 0,
      status: 'pending' as const,
    }));
    
    setUploadQueue(prev => [...prev, ...newItems]);
  };

  const updateQueueItem = (index: number, updates: Partial<typeof uploadQueue[0]>) => {
    setUploadQueue(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const removeQueueItem = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAllFiles = async () => {
    const pendingItems = uploadQueue.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      toast({
        title: "No files to upload",
        description: "All files have already been processed",
        variant: "destructive",
      });
      return;
    }
    
    for (let i = 0; i < uploadQueue.length; i++) {
      if (uploadQueue[i].status === 'pending') {
        try {
          await uploadSingleFile(uploadQueue[i], i);
        } catch (error: any) {
          console.log('Batch upload error:', error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${uploadQueue[i].title}: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    }
    
    // Invalidate relevant queries to refresh the content
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/content`] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    
    toast({
      title: "Upload complete",
      description: "All files have been processed",
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">MediaPro Admin</h1>
            </div>
            <Button onClick={() => window.location.href = '/'}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content Management</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Upload Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Video Upload Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div>
                      <Label htmlFor="userSelect">Upload Content For</Label>
                      <Select value={selectedUserId} onValueChange={(value) => {
                        console.log('User selected:', value);
                        console.log('Setting selectedUserId to:', value);
                        setSelectedUserId(value);
                        selectedUserRef.current = value;
                        console.log('selectedUserId after set:', selectedUserId);
                        console.log('selectedUserRef.current after set:', selectedUserRef.current);
                      }}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select a user account" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="defaultPrice">Default Price ($)</Label>
                      <Input
                        id="defaultPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Drag and Drop Zone */}
              <Card>
                <CardContent className="p-0">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <FileVideo className="w-12 h-12 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Drop video files here or click to browse
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Support for MP4, MOV, AVI, MKV, and WebM files
                        </p>
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                        >
                          Select Files
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="video/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Queue */}
              {uploadQueue.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        Upload Queue ({uploadQueue.length} files)
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          onClick={uploadAllFiles}
                          disabled={uploadQueue.every(item => item.status !== 'pending')}
                        >
                          Upload All
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setUploadQueue([])}
                        >
                          Clear Queue
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {uploadQueue.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              {item.status === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              ) : item.status === 'error' ? (
                                <X className="w-6 h-6 text-red-500" />
                              ) : item.status === 'uploading' ? (
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileVideo className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            
                            <div className="flex-1 space-y-3">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Title</Label>
                                  <Input
                                    value={item.title}
                                    onChange={(e) => updateQueueItem(index, { title: e.target.value })}
                                    disabled={item.status !== 'pending'}
                                  />
                                </div>
                                <div>
                                  <Label>Price ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.price}
                                    onChange={(e) => updateQueueItem(index, { price: e.target.value })}
                                    disabled={item.status !== 'pending'}
                                  />
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Duration (optional)</Label>
                                  <Input
                                    value={item.duration}
                                    onChange={(e) => updateQueueItem(index, { duration: e.target.value })}
                                    placeholder="e.g., 25:30"
                                    disabled={item.status !== 'pending'}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeQueueItem(index)}
                                    disabled={item.status === 'uploading'}
                                  >
                                    <X className="w-4 h-4" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <Label>Description</Label>
                                <Textarea
                                  value={item.description}
                                  onChange={(e) => updateQueueItem(index, { description: e.target.value })}
                                  placeholder="Enter description..."
                                  rows={2}
                                  disabled={item.status !== 'pending'}
                                />
                              </div>
                              
                              {item.status === 'uploading' && (
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Uploading...</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <Progress value={item.progress} />
                                </div>
                              )}
                              
                              <div className="text-sm text-gray-600">
                                File: {item.file.name} ({(item.file.size / 1024 / 1024).toFixed(1)} MB)
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                        <div className="w-20 h-6 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user: User) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          console.log('👤 User clicked! Navigating to:', `/admin/user/${user.id}`);
                          window.location.href = `/admin/user/${user.id}`;
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={(user.hasAllRemainingContent || user.hasAdditional3Videos) ? "default" : "secondary"}>
                            {(user.hasAllRemainingContent || user.hasAdditional3Videos) ? "Premium" : "Free"}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <ProjectManagementTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Admin;
