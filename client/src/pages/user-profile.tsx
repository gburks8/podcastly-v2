import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, Image, Calendar, DollarSign } from "lucide-react";
import type { User, ContentItem } from "@shared/schema";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  videos: ContentItem[];
  headshots: ContentItem[];
  totalItems: number;
}

export default function UserProfile() {
  const { isAuthenticated } = useAuth();
  const [match, params] = useRoute("/admin/user/:userId");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
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
            <h2 className="text-xl font-semibold">Projects</h2>
            <Badge variant="outline">{projects.length} projects</Badge>
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