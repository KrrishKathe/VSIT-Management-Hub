import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Users, GraduationCap, Briefcase, Eye, Download, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  college_roll_no: string;
  stream: string;
  year: number;
  skills: string[];
  expertise: string[];
  preferred_job_role: string;
  profile_image_url: string;
  resume_url: string;
  created_at: string;
}

export function FacultyDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStream, setFilterStream] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeProfiles: 0,
    streams: [] as string[],
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadStudents();
    }
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, filterStream, filterYear]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      
      // First check if user is faculty
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (profile?.role !== 'faculty' && profile?.role !== 'admin') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access this dashboard.",
        });
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudents(data || []);
      
      // Calculate stats
      const uniqueStreams = [...new Set(data?.map(s => s.stream) || [])];
      setStats({
        totalStudents: data?.length || 0,
        activeProfiles: data?.filter(s => s.full_name && s.college_roll_no)?.length || 0,
        streams: uniqueStreams,
      });

    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load student data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.college_roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Stream filter
    if (filterStream !== "all") {
      filtered = filtered.filter(student => student.stream === filterStream);
    }

    // Year filter
    if (filterYear !== "all") {
      filtered = filtered.filter(student => student.year.toString() === filterYear);
    }

    setFilteredStudents(filtered);
  };

  const downloadStudentData = (student: Student) => {
    const data = {
      name: student.full_name,
      email: student.email,
      rollNo: student.college_roll_no,
      stream: student.stream,
      year: student.year,
      skills: student.skills,
      expertise: student.expertise,
      preferredRole: student.preferred_job_role,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.full_name}_profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mobile-container py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vsit-primary mx-auto mb-4"></div>
          <p>Loading faculty dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="gradient-text mb-2">Faculty Dashboard</h1>
        <p className="text-muted-foreground">Manage student profiles and placement data</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-vsit-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-vsit-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Profiles</p>
                <p className="text-2xl font-bold">{stats.activeProfiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-vsit-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Streams</p>
                <p className="text-2xl font-bold">{stats.streams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filterStream} onValueChange={setFilterStream}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by stream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                {stats.streams.map(stream => (
                  <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1">1st Year</SelectItem>
                <SelectItem value="2">2nd Year</SelectItem>
                <SelectItem value="3">3rd Year</SelectItem>
                <SelectItem value="4">4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Student Profiles ({filteredStudents.length})
        </h2>
        
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No students found</p>
              <p className="text-muted-foreground">
                {searchTerm || filterStream !== "all" || filterYear !== "all"
                  ? "Try adjusting your search filters"
                  : "No student profiles have been created yet"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-medium transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        {student.profile_image_url ? (
                          <img
                            src={student.profile_image_url}
                            alt={student.full_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-vsit-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {student.full_name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold">{student.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {student.college_roll_no} • {student.stream}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{student.year}th Year</Badge>
                        {student.preferred_job_role && (
                          <Badge variant="outline">{student.preferred_job_role}</Badge>
                        )}
                      </div>

                      {student.skills && student.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {student.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} className="text-xs bg-vsit-primary/10 text-vsit-primary">
                              {skill}
                            </Badge>
                          ))}
                          {student.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{student.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadStudentData(student)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      
                      {student.resume_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(student.resume_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}