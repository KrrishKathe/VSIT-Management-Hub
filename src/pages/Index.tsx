import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfile } from "@/components/student/StudentProfile";
import { FacultyDashboard } from "@/components/faculty/FacultyDashboard";
import { GraduationCap, Users, BookOpen } from "lucide-react";

const Index = () => {
  const [userRole, setUserRole] = useState<string | null>(null);

  if (!userRole) {
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
              <div className="grid gap-4">
                <Button 
                  onClick={() => setUserRole('student')}
                  className="w-full vsit-button-primary flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  Continue as Student
                </Button>
                <Button 
                  onClick={() => setUserRole('faculty')}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Users className="h-5 w-5" />
                  Continue as Faculty
                </Button>
              </div>
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
              onClick={() => setUserRole(null)}
            >
              Switch Role
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {userRole === 'student' ? (
        <StudentProfile />
      ) : userRole === 'faculty' ? (
        <FacultyDashboard />
      ) : null}
    </div>
  );
};

export default Index;
