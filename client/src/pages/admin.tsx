import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Upload, Users, Video, Image, Trash2, X, FileVideo, CheckCircle } from "lucide-react";
import type { User, ContentItem } from "@shared/schema";

export default function Admin() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: allContent = [], isLoading: contentLoading } = useQuery<ContentItem[]>({
    queryKey: ["/api/admin/content"],
    enabled: isAuthenticated,
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
      formData.append('video', fileData.file);
      formData.append('title', fileData.title);
      formData.append('description', fileData.description);
      formData.append('type', 'video');
      formData.append('duration', fileData.duration);
      formData.append('price', fileData.price);
      formData.append('userId', fileData.userId);

      const response = await fetch("/api/admin/content", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'completed', progress: 100 } : item
      ));

      return await response.json();
    } catch (error: any) {
      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'error', progress: 0 } : item
      ));
      throw error;
    }
  };

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
    if (!selectedUserId) {
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
          toast({
            title: "Upload failed",
            description: `Failed to upload ${uploadQueue[i].title}: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
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
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select a user account" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                                  <AvatarFallback className="text-xs">{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{user.firstName} {user.lastName} ({user.email})</span>
                              </div>
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
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
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
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
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
                  <div className="space-y-4">
                    {allContent.map((item: ContentItem) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            {item.type === "video" ? (
                              <Video className="w-8 h-8 text-gray-400" />
                            ) : (
                              <Image className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={item.category === "free" ? "default" : "secondary"}>
                                {item.category}
                              </Badge>
                              <Badge variant="outline">{item.type}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
