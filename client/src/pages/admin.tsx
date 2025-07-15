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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    userId: "",
    title: "",
    description: "",
    type: "video",
    category: "free",
    duration: "",
    thumbnailUrl: "",
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
      setSelectedFile(null);
      setUploadForm({
        userId: "",
        title: "",
        description: "",
        type: "video",
        category: "free",
        duration: "",
        thumbnailUrl: "",
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect type based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) {
        setUploadForm(prev => ({ ...prev, type: 'video' }));
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
        setUploadForm(prev => ({ ...prev, type: 'headshot' }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
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
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userId">User</Label>
                      <Select value={uploadForm.userId} onValueChange={(value) => setUploadForm(prev => ({ ...prev, userId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
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
                      <Label htmlFor="file">File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept="video/*,image/*"
                        onChange={handleFileChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select value={uploadForm.type} onValueChange={(value) => setUploadForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="headshot">Headshot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {uploadForm.type === 'video' && (
                      <div>
                        <Label htmlFor="duration">Duration (e.g., 1:30)</Label>
                        <Input
                          id="duration"
                          value={uploadForm.duration}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="1:30"
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
                      placeholder="Content description..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                    <Input
                      id="thumbnailUrl"
                      value={uploadForm.thumbnailUrl}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                      placeholder="https://example.com/thumbnail.jpg"
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
