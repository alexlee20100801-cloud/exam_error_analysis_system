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
import NotificationConfigManagement from "./pages/NotificationConfigManagement";
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
import DocumentEditor from "@/pages/DocumentEditor";
import ChartLearningDemo from "@/pages/ChartLearningDemo";
import BatchOperationsPage from "@/pages/BatchOperationsPage";
import AnnotationCommunity from "@/pages/AnnotationCommunity";
import AnnotationDetail from "@/pages/AnnotationDetail";
import { AIAnnotationFeedbackStats } from "@/pages/AIAnnotationFeedbackStats";
import { MyFavoriteQuestions } from "@/pages/MyFavoriteQuestions";
import QuestionReview from "@/pages/admin/QuestionReview";
import DeduplicationManagement from "@/pages/admin/DeduplicationManagement";
import ComplianceManagement from "@/pages/admin/ComplianceManagement";
import QualityManagement from "@/pages/admin/QualityManagement";
import { SmartDocumentProcessor } from "@/pages/SmartDocumentProcessor";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import { AuthProvider } from "./lib/auth.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import WeaknessAnalysis from "@/pages/WeaknessAnalysis";
import SmartExamPaper from "@/pages/SmartExamPaper";
import PracticeHistory from "@/pages/PracticeHistory";
import DataCrawler from "./pages/DataCrawler";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import SmartScanner from "@/pages/SmartScanner";
import IdCardManagement from "@/pages/IdCardManagement";
import RecommendationEngine from "@/pages/RecommendationEngine";
import UploadError from "@/pages/UploadError";
import LearningDashboard from "@/pages/LearningDashboard";
import BatchEdit from "@/pages/BatchEdit";
import UploadHistory from "@/pages/UploadHistory";
import CacheMonitor from "@/pages/CacheMonitor";
import CacheWarmupManagement from "@/pages/CacheWarmupManagement";
import BatchOperationHistory from "@/pages/BatchOperationHistory";
import ABTestManagement from "@/pages/ABTestManagement";
import RecommendationManagement from "@/pages/RecommendationManagement";
import ExperimentDashboard from "@/pages/ExperimentDashboard";
import AuditReports from "@/pages/AuditReports";
import { LearningAnalytics } from "@/pages/LearningAnalytics";
import { SmartReviewReminder } from "@/pages/SmartReviewReminder";
import { LearningReportGeneration } from "@/pages/LearningReportGeneration";
import PrintPreview from "@/pages/PrintPreview";
import CollaborativeCollections from "@/pages/CollaborativeCollections";
import CollaborativeCollectionDetail from "@/pages/CollaborativeCollectionDetail";
import BatchUploadWithCrop from "@/pages/BatchUploadWithCrop";
import EnhancedPrintPreview from "@/pages/EnhancedPrintPreview";
import UnifiedUpload from "@/pages/UnifiedUpload";
import SeoManagement from "@/pages/SeoManagement";
import CrawlerManagement from "@/pages/CrawlerManagement";
import AIExamPaperGeneration from "@/pages/AIExamPaperGeneration";
import CrawlerConfigManagement from "@/pages/CrawlerConfigManagement";
import AiClassificationOptimization from "@/pages/AiClassificationOptimization";
import PaperAlgorithmOptimization from "@/pages/PaperAlgorithmOptimization";
import QuestionBank from "@/pages/QuestionBank";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AccountBinding from "@/pages/AccountBinding";
import IpBlockManager from "@/pages/admin/IpBlockManager";
import ExportCenter from "@/pages/ExportCenter";
import ParentSupervisionDashboard from "@/pages/ParentSupervisionDashboard";
import ExportTemplateManagement from "@/pages/ExportTemplateManagement";
import ParentBinding from "@/pages/ParentBinding";
import OcrSettings from "@/pages/OcrSettings";
import NotificationServiceSettings from "@/pages/NotificationServiceSettings";
import NotificationHistory from "@/pages/NotificationHistory";
import TerminologyManagement from "@/pages/TerminologyManagement";
import AlertConfigManagement from "@/pages/AlertConfigManagement";
import ExportHistoryManagement from "@/pages/ExportHistoryManagement";
import AdminManagement from "@/pages/AdminManagement";
import MonitoringDashboard from "@/pages/MonitoringDashboard";

function Router() {
  return (
    <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/" component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path="/error-questions" component={ErrorQuestions} />
      <Route path="/error-questions/:id" component={ErrorQuestionDetail} />
      <Route path="/upload-error" component={UploadError} />
      <Route path="/batch-upload-crop" component={BatchUploadWithCrop} />
      <Route path="/batch-edit/:sessionId" component={BatchEdit} />
      <Route path="/upload-history" component={UploadHistory} />
      <Route path="/cache-monitor" component={CacheMonitor} />
      <Route path="/admin/cache-warmup" component={CacheWarmupManagement} />
      <Route path="/admin/batch-history" component={BatchOperationHistory} />
      <Route path="/admin/ab-test" component={ABTestManagement} />
      <Route path="/admin/recommendation" component={RecommendationManagement} />
      <Route path="/admin/experiments" component={ExperimentDashboard} />
      <Route path="/admin/audit" component={AuditReports} />
      <Route path="/admin/crawler" component={CrawlerManagement} />
      <Route path="/ai-exam-paper" component={AIExamPaperGeneration} />
      <Route path="/learning-dashboard" component={LearningDashboard} />
      <Route path="/learning-analytics" component={LearningAnalytics} />
      <Route path="/smart-review-reminder" component={SmartReviewReminder} />
      <Route path="/admin/seo" component={SeoManagement} />
      <Route path="/learning-report-generation" component={LearningReportGeneration} />
      <Route path="/print-preview/:questionIds" component={PrintPreview} />
      <Route path="/enhanced-print-preview/:questionIds" component={EnhancedPrintPreview} />
      <Route path="/collaborative-collections" component={CollaborativeCollections} />
      <Route path="/collaborative-collections/:id" component={CollaborativeCollectionDetail} />
      <Route path="/practice-questions/:errorQuestionId" component={PracticeQuestions} />
      <Route path={"/practice"} component={Practice} />
      <Route path={"/question-practice"} component={QuestionPractice} />
      <Route path={"/learning-report"} component={LearningReport} />
          <Route path="/videos" component={VideoLearning} />
        <Route path="/review-plan" component={ReviewPlan} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/subject-report/:subject" component={SubjectReport} />
      <Route path="/notification-config" component={NotificationConfigManagement} />
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
      <Route path="/weakness-analysis" component={WeaknessAnalysis} />
      <Route path="/smart-exam-paper" component={SmartExamPaper} />
          <Route path="/practice-history" component={PracticeHistory} />
          <Route path="/smart-scanner" component={SmartScanner} />
          <Route path="/id-card-management" component={IdCardManagement} />
      <Route path="/upload-error-questions" component={UnifiedUpload} />
      <Route path="/document-upload" component={DocumentUpload} />
      <Route path="/document-editor" component={DocumentEditor} />
      <Route path="/document-editor/:id" component={DocumentEditor} />
      <Route path="/smart-document" component={SmartDocumentProcessor} />
      <Route path="/chart-learning-demo" component={ChartLearningDemo} />
      <Route path="/batch-operations" component={BatchOperationsPage} />
      <Route path="/community/annotations" component={AnnotationCommunity} />
      <Route path="/annotation/:id" component={AnnotationDetail} />
      <Route path="/admin/annotation-feedback" component={AIAnnotationFeedbackStats} />
      <Route path="/admin/question-review" component={QuestionReview} />
      <Route path="/admin/deduplication" component={DeduplicationManagement} />
      <Route path="/admin/compliance" component={ComplianceManagement} />
      <Route path="/admin/quality" component={QualityManagement} />
      <Route path="/recommendation" component={RecommendationEngine} />
        <Route path="/data-crawler" component={DataCrawler} />
        <Route path="/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/my-favorite-questions" component={MyFavoriteQuestions} />
      <Route path="/admin/crawler-config" component={CrawlerConfigManagement} />
      <Route path="/admin/ai-classification" component={AiClassificationOptimization} />
      <Route path="/admin/paper-algorithm" component={PaperAlgorithmOptimization} />
      <Route path="/question-bank" component={QuestionBank} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/account-binding" component={AccountBinding} />
      <Route path="/admin/ip-manager" component={IpBlockManager} />
      <Route path="/export-center" component={ExportCenter} />
      <Route path="/parent-supervision" component={ParentSupervisionDashboard} />
      <Route path="/export-template-management" component={ExportTemplateManagement} />
      <Route path="/parent-binding" component={ParentBinding} />
      <Route path="/ocr-settings" component={OcrSettings} />
      <Route path="/notification-service-settings" component={NotificationServiceSettings} />
      <Route path="/notification-history" component={NotificationHistory} />
      <Route path="/admin/terminology" component={TerminologyManagement} />
      <Route path="/admin/alert-config" component={AlertConfigManagement} />
      <Route path="/admin/export-history" component={ExportHistoryManagement} />
      <Route path="/admin/admin-management" component={AdminManagement} />
      <Route path="/admin/monitoring" component={MonitoringDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" switchable={true}>
          <TooltipProvider>
            <Toaster />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <Router />
            <MobileBottomNav />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
