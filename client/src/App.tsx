import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ErrorQuestions from "./pages/ErrorQuestions";
import ErrorQuestionDetail from "./pages/ErrorQuestionDetail";
import PracticeQuestions from "./pages/PracticeQuestions";
import Practice from "./pages/Practice";
import LearningReport from "./pages/LearningReport";
import VideoLearning from "./pages/VideoLearning";
import ReviewPlan from "./pages/ReviewPlan";
import Achievements from "./pages/Achievements";
import SubjectReport from "./pages/SubjectReport";
import KnowledgePointDetail from "@/pages/KnowledgePointDetail";
import Review from "@/pages/Review";
import StudyCalendar from "@/pages/StudyCalendar";
import ParentDashboard from "@/pages/ParentDashboard";
import ParentNotifications from "@/pages/ParentNotifications";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path="/error-questions" component={ErrorQuestions} />
      <Route path="/error-questions/:id" component={ErrorQuestionDetail} />
      <Route path="/practice-questions/:errorQuestionId" component={PracticeQuestions} />
      <Route path={"/practice"} component={Practice} />
      <Route path={"/report"} component={LearningReport} />
          <Route path="/videos" component={VideoLearning} />
        <Route path="/review-plan" component={ReviewPlan} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/subject-report/:subject" component={SubjectReport} />
      <Route path="/knowledge-point/:id" component={KnowledgePointDetail} />
      <Route path="/review" component={Review} />
      <Route path="/study-calendar" component={StudyCalendar} />
      <Route path="/parent" component={ParentDashboard} />
      <Route path="/parent/notifications" component={ParentNotifications} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
