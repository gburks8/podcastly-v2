import React from "react"
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { ArrowLeft, Video, Image, Plus, Upload, X, FileVideo, CheckCircle, Calendar, Edit2, Check, X as XIcon } from "lucide-react";
import type { User, ContentItem } from "@shared/schema";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  videos: ContentItem[];
  headshots: ContentItem[];
  totalItems: number;
}

interface QueueItem {
  id: string;
  file: File;
  title: string;
  description: string;
  type: 'video' | 'headshot';
  category: 'free' | 'premium';
  price: string;
  duration?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
}

export default function UserProfile() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/user/:userId");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!match || !params) {
    return <div>User not found</div>;
  }

  const userId = (params as { userId: string }).userId;

  const { data: user } = useQuery<User>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: isAuthenticated && !!userId,
  });

  const { data: userProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", "user", userId],
    queryFn: async () => {
      // Get projects for this user
      const projectsResponse = await fetch(`/api/admin/users/${userId}/projects`, {
        credentials: "include",
      });
      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch user projects: ${projectsResponse.status}`);
      }
      return projectsResponse.json();
    },
    enabled: isAuthenticated && !!userId,
  });

  // Update project name mutation
  const updateProjectNameMutation = useMutation({
    mutationFn: async ({ projectId, newName }: { projectId: string; newName: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error('Failed to update project name');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", "user", userId] });
      toast({
        title: "Project updated",
        description: "Project name has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Could not update project name. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Upload functionality
  const processFiles = useCallback((files: FileList | File[]) => {
    if (!user) return;

    Array.from(files).forEach((file, index) => {
      // Check if file type is supported
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported video or image file`,
          variant: "destructive",
        });
        return;
      }

      const fileType = file.type.startsWith('video/') ? 'video' : 'headshot';
      const queueItem: QueueItem = {
        id: `${Date.now()}-${index}`,
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: "",
        type: fileType,
        category: 'premium',
        price: '25.00',
        duration: '',
        status: 'pending',
        progress: 0,
      };
      
      setUploadQueue(prev => [...prev, queueItem]);
    });
  }, [user, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    processFiles(files);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setUploadQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (item: QueueItem) => {
      const formData = new FormData();
      
      if (item.type === 'video') {
        formData.append('video', item.file);
      } else {
        formData.append('headshot', item.file);
      }
      
      formData.append('title', item.title);
      formData.append('description', item.description);
      formData.append('type', item.type);
      formData.append('category', item.category);
      formData.append('price', item.price);
      formData.append('userId', user?.id || '');
      if (item.duration) {
        formData.append('duration', item.duration);
      }

      const response = await fetch('/api/admin/content', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onMutate: (item) => {
      updateQueueItem(item.id, { status: 'uploading', progress: 0 });
    },
    onSuccess: (data, item) => {
      updateQueueItem(item.id, { status: 'completed', progress: 100 });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content", "user", userId] });
      toast({
        title: "Upload successful",
        description: `${item.title} has been uploaded successfully`,
      });
    },
    onError: (error, item) => {
      updateQueueItem(item.id, { status: 'error', progress: 0 });
      toast({
        title: "Upload failed",
        description: `Failed to upload ${item.title}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const processUploadQueue = useCallback(async () => {
    const pendingItems = uploadQueue.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) return;
    
    // First, create a new project with the specified name
    let projectId: string;
    try {
      const projectName = newProjectName.trim() || `Project ${new Date().toLocaleDateString()}`;
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          userId: user?.id
        })
      });
      
      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }
      
      const project = await projectResponse.json();
      projectId = project.id;
      
      toast({
        title: "Project created",
        description: `Created project "${projectName}" - uploading content...`,
      });
    } catch (error) {
      toast({
        title: "Failed to create project",
        description: "Could not create project for uploads",
        variant: "destructive",
      });
      return;
    }
    
    // Then upload all content items and associate them with the project
    for (const item of pendingItems) {
      try {
        // Update the upload mutation to include projectId
        // Execute the upload mutation for each item
        const formData = new FormData();
        
        if (item.type === 'video') {
          formData.append('video', item.file);
        } else {
          formData.append('headshot', item.file);
        }
        
        formData.append('title', item.title);
        formData.append('description', item.description);
        formData.append('type', item.type);
        formData.append('category', item.category);
        formData.append('price', item.price);
        formData.append('userId', user?.id || '');
        formData.append('projectId', projectId);
        if (item.duration) {
          formData.append('duration', item.duration);
        }

        updateQueueItem(item.id, { status: 'uploading', progress: 0 });

        const response = await fetch('/api/admin/content', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        updateQueueItem(item.id, { status: 'completed', progress: 100 });
        
      } catch (error) {
        updateQueueItem(item.id, { status: 'error', progress: 0 });
        toast({
          title: "Upload failed",
          description: `Failed to upload ${item.title}: ${error.message}`,
          variant: "destructive",
        });
      }
    }
    
    // Clear the form and close dialog after successful upload
    const completedItems = uploadQueue.filter(item => item.status === 'completed');
    if (completedItems.length === pendingItems.length) {
      setUploadQueue([]);
      setNewProjectName("");
      setShowCreateProject(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId, "projects"] });
      toast({
        title: "Upload complete",
        description: `All ${pendingItems.length} files uploaded successfully to "${newProjectName.trim() || `Project ${new Date().toLocaleDateString()}`}"`,
      });
    }
  }, [uploadQueue, uploadMutation, newProjectName, user, toast, queryClient, userId, updateQueueItem, setUploadQueue, setNewProjectName, setShowCreateProject]);

  // Project name editing
  const handleEditProjectName = useCallback(() => {
    if (selectedProject) {
      setProjectNameInput(selectedProject.name);
      setEditingProjectName(true);
    }
  }, [selectedProject]);

  const handleSaveProjectName = useCallback(() => {
    if (selectedProject && projectNameInput.trim()) {
      // Update locally for immediate feedback
      const newName = projectNameInput.trim();
      setSelectedProject({
        ...selectedProject,
        name: newName
      });
      setEditingProjectName(false);
      
      // Save to database via API
      updateProjectNameMutation.mutate({ 
        projectId: selectedProject.id, 
        newName 
      });
    }
  }, [selectedProject, projectNameInput, updateProjectNameMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectName(false);
    setProjectNameInput("");
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleBackToAdmin = () => {
    window.history.back();
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
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={handleBackToAdmin}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {selectedProject ? (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => setSelectedProject(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            
            <div className="flex items-center gap-2 flex-1">
              {editingProjectName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveProjectName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="text-xl font-semibold max-w-xs"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveProjectName}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditProjectName}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Badge variant="secondary">{selectedProject.totalItems} items</Badge>
            </div>
          </div>

          <Tabs defaultValue="videos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="videos">Videos ({(selectedProject.videos || []).length})</TabsTrigger>
              <TabsTrigger value="headshots">Headshots ({(selectedProject.headshots || []).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="videos">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(selectedProject.videos || []).map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="bg-gray-100 relative flex items-center justify-center" style={{ minHeight: '200px' }}>
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="max-w-full max-h-full object-contain"
                          style={{ maxHeight: '300px' }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Video className="w-8 h-8 text-white opacity-70 drop-shadow-lg" />
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{video.duration}</span>
                        <span>{formatPrice(video.price)}</span>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">{video.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="headshots">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(selectedProject.headshots || []).map((headshot) => (
                  <Card key={headshot.id} className="overflow-hidden">
                    <div className="aspect-square bg-gray-100 relative">
                      {headshot.thumbnailUrl && (
                        <img
                          src={headshot.thumbnailUrl}
                          alt={headshot.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="w-6 h-6 text-white opacity-70" />
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs">{headshot.title}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Projects</h2>
              <Badge variant="outline">{userProjects.length} projects</Badge>
            </div>
            
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Project for {user.firstName} {user.lastName}</DialogTitle>
                  <DialogDescription>
                    Upload videos and headshots to create a new project gallery. Files will be organized automatically.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Project Name Section */}
                  <div className="space-y-2">
                    <Label htmlFor="projectName" className="text-base font-semibold">Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="Enter project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      This will be the name displayed for this project in the client's gallery.
                    </p>
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Upload Content</Label>
                    
                    {/* Drag and Drop Zone */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-lg font-medium">
                            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Support for videos (MP4, MOV, AVI) and images (JPG, PNG, GIF)
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 h-px bg-gray-200"></div>
                          <span className="text-sm text-muted-foreground">or</span>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadMutation.isPending}
                          className="mt-2"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="video/*,image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Upload Queue */}
                  {uploadQueue.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Label className="text-base font-semibold">Upload Queue ({uploadQueue.length})</Label>
                          {uploadQueue.some(item => item.status === 'uploading' || item.status === 'completed') && (
                            <div className="flex-1 max-w-xs">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Overall Progress</span>
                                <span>{Math.round((uploadQueue.filter(item => item.status === 'completed').length / uploadQueue.length) * 100)}%</span>
                              </div>
                              <Progress value={(uploadQueue.filter(item => item.status === 'completed').length / uploadQueue.length) * 100} />
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={processUploadQueue}
                          disabled={uploadMutation.isPending || uploadQueue.every(item => item.status !== 'pending')}
                        >
                          {uploadMutation.isPending ? 'Uploading...' : 'Upload All'}
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {uploadQueue.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {item.type === 'video' ? (
                                  <FileVideo className="w-6 h-6 text-blue-500" />
                                ) : (
                                  <Image className="w-6 h-6 text-green-500" />
                                )}
                                <div>
                                  <p className="font-medium">{item.file.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {item.type} • {(item.file.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {item.status === 'completed' && (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                                {item.status === 'error' && (
                                  <X className="w-5 h-5 text-red-500" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromQueue(item.id)}
                                  disabled={item.status === 'uploading'}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Title</Label>
                                <Input
                                  value={item.title}
                                  onChange={(e) => updateQueueItem(item.id, { title: e.target.value })}
                                  placeholder="Enter title..."
                                  disabled={item.status !== 'pending'}
                                />
                              </div>
                              
                              <div>
                                <Label>Category</Label>
                                <Select
                                  value={item.category}
                                  onValueChange={(value: 'free' | 'premium') => updateQueueItem(item.id, { category: value })}
                                  disabled={item.status !== 'pending'}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label>Price</Label>
                                <Input
                                  value={item.price}
                                  onChange={(e) => updateQueueItem(item.id, { price: e.target.value })}
                                  placeholder="25.00"
                                  disabled={item.status !== 'pending'}
                                />
                              </div>
                              
                              {item.type === 'video' && (
                                <div>
                                  <Label>Duration</Label>
                                  <Input
                                    value={item.duration}
                                    onChange={(e) => updateQueueItem(item.id, { duration: e.target.value })}
                                    placeholder="e.g. 2:30"
                                    disabled={item.status !== 'pending'}
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={item.description}
                                onChange={(e) => updateQueueItem(item.id, { description: e.target.value })}
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProjects.map((project) => (
              <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedProject(project)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {project.name}
                    <Badge variant="secondary">{project.totalItems}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(project.createdAt)}
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>{project.videos?.length || 0} videos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <span>{project.headshots?.length || 0} headshots</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {(project.videos || []).slice(0, 4).map((video, index) => (
                        <div key={video.id} className="w-12 h-8 bg-gray-200 rounded text-xs flex items-center justify-center">
                          V{index + 1}
                        </div>
                      ))}
                      {(project.videos || []).length > 4 && (
                        <div className="w-12 h-8 bg-gray-300 rounded text-xs flex items-center justify-center">
                          +{(project.videos || []).length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {userProjects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-center">
                  Content uploaded for this user will appear here as projects.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}