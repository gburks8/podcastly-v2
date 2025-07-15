import { useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, Users, Video, Image, Trash2 } from "lucide-react";
import type { User, ContentItem } from "@shared/schema";

export default function Admin() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMainFile, setSelectedMainFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "video",
    duration: "",
    price: "25.00",
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
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

  const { data: allContent = [], isLoading: contentLoading } = useQuery({
    queryKey: ["/api/admin/content"],
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

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      setSelectedMainFile(null);
      setSelectedThumbnail(null);
      setUploadForm({
        title: "",
        description: "",
        type: "video",
        duration: "",
        price: "25.00",
      });
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
          description: "Failed to upload content: " + error.message,
          variant: "destructive",
        });
      }
    },
  });

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

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMainFile(file);
      // Auto-detect type based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) {
        setUploadForm(prev => ({ ...prev, type: 'video' }));
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
        setUploadForm(prev => ({ ...prev, type: 'headshot' }));
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnail(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMainFile) {
      toast({
        title: "Error",
        description: "Please select a main content file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    // Add main file with appropriate field name
    if (uploadForm.type === 'video') {
      formData.append('video', selectedMainFile);
    } else {
      formData.append('headshot', selectedMainFile);
    }
    
    // Add thumbnail if provided
    if (selectedThumbnail) {
      formData.append('thumbnail', selectedThumbnail);
    }
    
    // Add form data
    Object.entries(uploadForm).forEach(([key, value]) => {
      formData.append(key, value);
    });

    uploadMutation.mutate(formData);
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload New Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Content Type</Label>
                      <Select value={uploadForm.type} onValueChange={(value) => setUploadForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Podcast</SelectItem>
                          <SelectItem value="headshot">Professional Headshot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={uploadForm.price}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, price: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mainFile">
                        {uploadForm.type === 'video' ? 'Video File' : 'Headshot Image'}
                      </Label>
                      <Input
                        id="mainFile"
                        type="file"
                        accept={uploadForm.type === 'video' ? 'video/*' : 'image/*'}
                        onChange={handleMainFileChange}
                        required
                      />
                      {selectedMainFile && (
                        <p className="text-sm text-gray-600 mt-1">
                          Selected: {selectedMainFile.name}
                        </p>
                      )}
                    </div>

                    {uploadForm.type === 'video' && (
                      <div>
                        <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
                        <Input
                          id="thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                        />
                        {selectedThumbnail && (
                          <p className="text-sm text-gray-600 mt-1">
                            Selected: {selectedThumbnail.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter content title"
                        required
                      />
                    </div>

                    {uploadForm.type === 'video' && (
                      <div>
                        <Label htmlFor="duration">Duration (optional)</Label>
                        <Input
                          id="duration"
                          value={uploadForm.duration}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="e.g., 25:30"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter a description for this content..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Uploading..." : "Upload Content"}
                  </Button>
                </form>
              </CardContent>
            </Card>
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
                          <img 
                            src={user.profileImageUrl || "https://via.placeholder.com/40"} 
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.hasPurchasedPremium ? "default" : "secondary"}>
                            {user.hasPurchasedPremium ? "Premium" : "Free"}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
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
