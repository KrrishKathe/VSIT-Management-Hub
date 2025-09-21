import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfile } from "@/components/student/StudentProfile";
import { FacultyDashboard } from "@/components/faculty/FacultyDashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Users, LogOut, Briefcase } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else {
        getUserRole();
      }
    }
  }, [user, loading, navigate]);

  const getUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data?.role) {
        setUserRole(data.role);
      } else {
        // Create initial profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            role: 'student' // Default to student
          });

        if (!insertError) {
          setUserRole('student');
        }
      }
    } catch (error) {
      console.error('Error in getUserRole:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vsit-primary/10 via-background to-vsit-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vsit-primary mx-auto mb-4"></div>
          <p>Loading VSIT Placement Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vsit-primary/10 via-background to-vsit-accent/10 flex items-center justify-center p-4">
        <div className="mobile-container text-center">
          <Card>
            <CardHeader>
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="gradient-text text-2xl">VSIT Placement Hub</CardTitle>
              <p className="text-muted-foreground">Connect. Apply. Succeed.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center mb-6">
                Your gateway to placement opportunities at VSIT College
              </p>
              <Button 
                onClick={() => navigate("/auth")}
                className="w-full vsit-button-primary"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vsit-primary/5 via-background to-vsit-accent/5">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="mobile-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">VSIT Placement Hub</h1>
                <p className="text-xs text-muted-foreground capitalize">{userRole} Dashboard</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {userRole === 'student' ? (
        <StudentProfile />
      ) : userRole === 'faculty' || userRole === 'admin' ? (
        <FacultyDashboard />
      ) : (
        <div className="mobile-container py-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Setting up your profile...</h2>
              <p className="text-muted-foreground">Please wait while we configure your account.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;
