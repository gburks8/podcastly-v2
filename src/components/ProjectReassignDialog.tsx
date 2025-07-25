import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCheck } from "lucide-react";
import type { User } from "@shared/schema";

interface ProjectReassignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentUserId: string;
}

export function ProjectReassignDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentUserId,
}: ProjectReassignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch all users for selection
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isOpen,
  });

  // Get current project owner details
  const currentOwner = users.find(u => u.id === currentUserId);
  
  // Filter out current owner from available options
  const availableUsers = users.filter(u => u.id !== currentUserId);

  const reassignMutation = useMutation({
    mutationFn: async (newUserId: string) => {
      const response = await fetch(`/api/projects/${projectId}/reassign`, {
        method: "PUT",
        body: JSON.stringify({ newUserId }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reassign project');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Project Reassigned",
        description: data?.message || "Project reassigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose();
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign project",
        variant: "destructive",
      });
    },
  });

  const handleReassign = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to assign the project to",
        variant: "destructive",
      });
      return;
    }
    reassignMutation.mutate(selectedUserId);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Reassign Project
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of "{projectName}" to another user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Owner */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Current Owner</label>
            {currentOwner ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentOwner.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {currentOwner.firstName?.[0]}{currentOwner.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{currentOwner.firstName} {currentOwner.lastName}</p>
                  <p className="text-sm text-gray-500">{currentOwner.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">
                Loading current owner...
              </div>
            )}
          </div>

          {/* New Owner Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">New Owner</label>
            {usersLoading ? (
              <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">
                Loading users...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a new owner..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                          <span className="text-sm text-gray-500 ml-1">({user.email})</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Preview selected user */}
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-blue-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-blue-700">{selectedUser.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reassignMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleReassign} 
            disabled={!selectedUserId || reassignMutation.isPending}
          >
            {reassignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning...
              </>
            ) : (
              'Reassign Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}