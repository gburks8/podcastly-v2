import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Video, Image, Plus, Upload, X, FileVideo, CheckCircle, Calendar } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!match || !params?.userId) {
    return <div>User not found</div>;
  }

  const { data: user } = useQuery<User>({
    queryKey: ["/api/admin/users", params.userId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${params.userId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: isAuthenticated && !!params.userId,
  });

  const { data: userContent = [] } = useQuery<ContentItem[]>({
    queryKey: ["/api/admin/content", "user", params.userId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/content?userId=${params.userId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user content");
      return response.json();
    },
    enabled: isAuthenticated && !!params.userId,
  });

  // Group content into projects (batches of 12)
  const projects: Project[] = [];
  const sortedContent = [...userContent].sort((a, b) => 
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content", "user", params?.userId] });
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
    
    for (const item of pendingItems) {
      await uploadMutation.mutateAsync(item);
    }
  }, [uploadQueue, uploadMutation]);

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
            <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
            <Badge variant="secondary">{selectedProject.totalItems} items</Badge>
          </div>

          <Tabs defaultValue="videos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="videos">Videos ({selectedProject.videos.length})</TabsTrigger>
              <TabsTrigger value="headshots">Headshots ({selectedProject.headshots.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="videos">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProject.videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 relative">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-8 h-8 text-white opacity-70" />
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
                {selectedProject.headshots.map((headshot) => (
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
              <Badge variant="outline">{projects.length} projects</Badge>
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
                        <Label className="text-base font-semibold">Upload Queue ({uploadQueue.length})</Label>
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
            {projects.map((project) => (
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
                        <span>{project.videos.length} videos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <span>{project.headshots.length} headshots</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {project.videos.slice(0, 4).map((video, index) => (
                        <div key={video.id} className="w-12 h-8 bg-gray-200 rounded text-xs flex items-center justify-center">
                          V{index + 1}
                        </div>
                      ))}
                      {project.videos.length > 4 && (
                        <div className="w-12 h-8 bg-gray-300 rounded text-xs flex items-center justify-center">
                          +{project.videos.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
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