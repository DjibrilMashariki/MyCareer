import { Link } from "react-router-dom";
import {
  FileText,
  GraduationCap,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  Send,
  BookOpen,
  HelpCircle,
  Sparkles,
  LogIn,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const portals = [
    {
      title: "Student Portal",
      description: "Create, submit, and track your resume drafts. Get feedback from career services staff.",
      icon: GraduationCap,
      href: "/student",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Staff Portal",
      description: "Review student resumes, provide feedback, and approve submissions.",
      icon: Users,
      href: "/staff",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Admin Portal",
      description: "Monitor system statistics, manage all resumes, and track staff workload.",
      icon: Shield,
      href: "/admin",
      color: "from-orange-500 to-amber-500"
    }
  ];

  const features = [
    {
      icon: Send,
      title: "Submit Resumes",
      description: "Students can easily create and submit resume drafts for review"
    },
    {
      icon: Clock,
      title: "Track Progress",
      description: "Real-time status updates from draft to approved"
    },
    {
      icon: CheckCircle,
      title: "Get Feedback",
      description: "Receive expert feedback from career services staff"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground flex flex-col z-40">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-primary">MyCareer</h1>
              <p className="text-xs text-sidebar-foreground/60">Resume Review</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
            Navigation
          </p>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <Sparkles className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <a
            href="/#about"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <BookOpen className="w-5 h-5" />
            <span>About</span>
          </a>
          <a
            href="/#features"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Features</span>
          </a>
        </nav>

        {/* Portal Links */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-3">
            Access Portals
          </p>
          <div className="space-y-2">
            <Link to="/student">
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
                <GraduationCap className="w-4 h-4 mr-2" />
                Student Portal
              </Button>
            </Link>
            <Link to="/staff">
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
                <Users className="w-4 h-4 mr-2" />
                Staff Portal
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
                <Shield className="w-4 h-4 mr-2" />
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/30 text-sidebar-foreground/70">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Need help? Contact support</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72">
        {/* Hero Section */}
        <section className="gradient-primary px-8 pt-24 pb-32 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
              Welcome to MyCareer
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in">
              Your university's resume review platform. Get expert feedback on your resume
              from career services staff and land your dream job.
            </p>
            <div className="flex flex-wrap gap-4 justify-center animate-fade-in">
              {user ? (
                <Link to={`/${user.role}`}>
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-none border-none">
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/10 hover:text-white">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Decorative Wave Divider */}
          <div className="absolute left-0 bottom-0 w-full overflow-hidden leading-none z-0">
            <svg className="relative block w-full h-[60px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,111.47,192.39,83.9,235.61,64.44,279.79,65.34,321.39,56.44Z" className="fill-background"></path>
            </svg>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-8 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4 gradient-text">
              How It Works
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              A simple three-step process to get your resume reviewed and approved
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center border-border/50 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  {/* Subtle step watermark */}
                  <div className="absolute -right-4 -top-8 text-[140px] font-black text-muted/10 select-none z-0 group-hover:scale-110 group-hover:text-muted/20 transition-all duration-500">
                    {index + 1}
                  </div>

                  <CardHeader className="relative z-10 pt-8">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-md group-hover:-translate-y-1 transition-transform">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <CardDescription className="text-muted-foreground text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Portals Section */}
        <section id="about" className="px-8 py-16 bg-muted/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Access Your Portal
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Select your role to access the appropriate dashboard
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {portals.map((portal, index) => (
                <Link key={index} to={portal.href}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center mb-4`}>
                        <portal.icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="flex items-center justify-between">
                        {portal.title}
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{portal.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-8 border-t border-border">
          <div className="max-w-5xl mx-auto text-center text-muted-foreground">
            <p>© 2024 MyCareer Resume Review Platform. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
