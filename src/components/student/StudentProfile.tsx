import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, FileText, Download } from "lucide-react";

const studentProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  aboutYourself: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  collegeRollNo: z.string().min(1, "Roll number is required"),
  stream: z.string().min(1, "Stream is required"),
  year: z.number().min(1).max(4),
  skills: z.string().optional(),
  expertise: z.string().optional(),
  pastExperience: z.string().optional(),
  preferredJobRole: z.string().optional(),
  pastEducation: z.string().optional(),
  courses: z.string().optional(),
});

type StudentProfileData = z.infer<typeof studentProfileSchema>;

export function StudentProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<StudentProfileData>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      fullName: "",
      aboutYourself: "",
      email: "",
      phone: "",
      collegeRollNo: "",
      stream: "",
      year: 1,
      skills: "",
      expertise: "",
      pastExperience: "",
      preferredJobRole: "",
      pastEducation: "",
      courses: "",
    },
  });

  useEffect(() => {
    if (user) {
      loadExistingProfile();
    }
  }, [user]);

  const loadExistingProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setExistingProfile(data);
        form.reset({
          fullName: data.full_name || "",
          aboutYourself: data.about_yourself || "",
          email: data.email || "",
          phone: data.phone || "",
          collegeRollNo: data.college_roll_no || "",
          stream: data.stream || "",
          year: data.year || 1,
          skills: data.skills?.join(", ") || "",
          expertise: data.expertise?.join(", ") || "",
          pastExperience: data.past_experience || "",
          preferredJobRole: data.preferred_job_role || "",
          pastEducation: JSON.stringify(data.past_education) || "",
          courses: data.courses?.join(", ") || "",
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
    }
  };

  const handleCertificatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCertificates(prev => [...prev, ...files]);
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return data.path;
  };

  const generateResume = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const formData = form.getValues();
      const resumeData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        aboutYourself: formData.aboutYourself,
        skills: formData.skills?.split(',').map(s => s.trim()) || [],
        experience: formData.pastExperience,
        education: formData.pastEducation,
        preferredRole: formData.preferredJobRole
      };

      const { data, error } = await supabase.functions.invoke('generate-resume', {
        body: { resumeData }
      });

      if (error) throw error;

      toast({
        title: "Resume Generated!",
        description: "Your AI-generated resume is ready.",
      });

    } catch (error) {
      console.error('Error generating resume:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate resume. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: StudentProfileData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // First create/update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          role: 'student'
        });

      if (profileError) throw profileError;

      // Upload profile image if provided
      let profileImageUrl = existingProfile?.profile_image_url;
      if (profileImage) {
        const imagePath = `${user.id}/profile-${Date.now()}`;
        await uploadFile(profileImage, 'profile-images', imagePath);
        const { data: imageData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(imagePath);
        profileImageUrl = imageData.publicUrl;
      }

      // Upload certificates if provided
      let certificateUrls = existingProfile?.certificate_urls || [];
      if (certificates.length > 0) {
        const newCertUrls = await Promise.all(
          certificates.map(async (cert, index) => {
            const certPath = `${user.id}/cert-${Date.now()}-${index}`;
            await uploadFile(cert, 'certificates', certPath);
            const { data: certData } = supabase.storage
              .from('certificates')
              .getPublicUrl(certPath);
            return certData.publicUrl;
          })
        );
        certificateUrls = [...certificateUrls, ...newCertUrls];
      }

      // Create/update student profile
      const studentData = {
        user_id: user.id,
        profile_image_url: profileImageUrl,
        full_name: data.fullName,
        about_yourself: data.aboutYourself,
        email: data.email,
        phone: data.phone,
        college_roll_no: data.collegeRollNo,
        stream: data.stream,
        year: data.year,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()) : [],
        expertise: data.expertise ? data.expertise.split(',').map(s => s.trim()) : [],
        past_experience: data.pastExperience,
        preferred_job_role: data.preferredJobRole,
        past_education: data.pastEducation ? JSON.parse(data.pastEducation) : {},
        courses: data.courses ? data.courses.split(',').map(s => s.trim()) : [],
        certificate_urls: certificateUrls,
      };

      const { error } = await supabase
        .from('students')
        .upsert(studentData);

      if (error) throw error;

      toast({
        title: "Profile Updated!",
        description: "Your student profile has been successfully saved.",
      });

      // Reload the profile
      loadExistingProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="gradient-text">Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Profile Image</label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-vsit-primary file:text-white"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@vsit.edu.in" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collegeRollNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College Roll No *</FormLabel>
                      <FormControl>
                        <Input placeholder="20XX/CS/XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stream"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your stream" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Information Technology">Information Technology</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Mechanical">Mechanical</SelectItem>
                          <SelectItem value="Civil">Civil</SelectItem>
                          <SelectItem value="Electrical">Electrical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* About Yourself */}
              <FormField
                control={form.control}
                name="aboutYourself"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tell me about yourself</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your background, interests, and goals..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Skills and Expertise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Skills</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="React, Java, Python, Communication (comma separated)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expertise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Areas of Expertise</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Web Development, AI/ML, Data Science (comma separated)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Experience and Preferences */}
              <FormField
                control={form.control}
                name="pastExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Experience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your internships, projects, or work experience..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredJobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Job Role</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Developer, Data Analyst, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Education and Courses */}
              <FormField
                control={form.control}
                name="pastEducation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Education</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your 12th grade, diploma details..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Courses</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Online courses, certifications (comma separated)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Certificate Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Certificates</label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertificatesChange}
                    className="file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-vsit-secondary file:text-white"
                  />
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                {certificates.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {certificates.length} file(s) selected
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  className="flex-1 vsit-button-primary"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={generateResume}
                  disabled={isLoading || !existingProfile}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Generate AI Resume
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}