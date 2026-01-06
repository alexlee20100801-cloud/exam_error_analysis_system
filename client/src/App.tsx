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
import StudentProfile from "@/pages/StudentProfile";
import ExamPaperGenerator from "@/pages/ExamPaperGenerator";
import ExamPaperDetail from "@/pages/ExamPaperDetail";
import QuestionBankManagement from "@/pages/QuestionBankManagement";
import RealExamPractice from "@/pages/RealExamPractice";
import LearningPath from "@/pages/LearningPath";
import Settings from "@/pages/Settings";
import { QuestionPractice } from "@/pages/QuestionPractice";
import TaskManagement from "@/pages/TaskManagement";
import PracticePool from "@/pages/PracticePool";
import PracticeDetail from "@/pages/PracticeDetail";
import MyFavorites from "@/pages/MyFavorites";
import ReviewReminders from "@/pages/ReviewReminders";
import DocumentUpload from "@/pages/DocumentUpload";
import ChartLearningDemo from "@/pages/ChartLearningDemo";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileBottomNav } from "@/components/MobileBottomNav";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path="/error-questions" component={ErrorQuestions} />
      <Route path="/error-questions/:id" component={ErrorQuestionDetail} />
      <Route path="/practice-questions/:errorQuestionId" component={PracticeQuestions} />
      <Route path={"/practice"} component={Practice} />
      <Route path={"/question-practice"} component={QuestionPractice} />
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
      <Route path="/profile" component={StudentProfile} />
      <Route path="/exam-generator" component={ExamPaperGenerator} />
      <Route path="/exam-paper/:id" component={ExamPaperDetail} />
      <Route path="/admin/question-bank" component={QuestionBankManagement} />
      <Route path="/real-exam-practice" component={RealExamPractice} />
      <Route path="/learning-path" component={LearningPath} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/tasks" component={TaskManagement} />
      <Route path="/practice-pool" component={PracticePool} />
      <Route path="/practice/:id" component={PracticeDetail} />
      <Route path="/favorites" component={MyFavorites} />
      <Route path="/reminders" component={ReviewReminders} />
      <Route path="/document-upload" component={DocumentUpload} />
      <Route path="/chart-learning-demo" component={ChartLearningDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
          <MobileBottomNav />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
