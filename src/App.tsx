import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTopic from './pages/AddTopic';
import TopicDetails from './pages/TopicDetails';
import Practice from './pages/Practice';
import Review from './pages/Review';
import Exam from './pages/Exam';
import ExamHistory from './pages/ExamHistory';
import WeakWords from './pages/WeakWords';
import Settings from './pages/Settings';
import GroqSttTest from './pages/GroqSttTest';
import TELCApp from './components/telc/TELCModule';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEffect } from 'react';
import { useTopicStore } from './store/useTopicStore';

function App() {
  const initializeAuth = useTopicStore(state => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes sharing Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/topic/new" element={<AddTopic />} />
                    <Route path="/topic/:id" element={<TopicDetails />} />
                    <Route path="/practice/:topicId" element={<Practice />} />
                    <Route path="/review" element={<Review />} />
                    <Route path="/exam/:topicId" element={<Exam />} />
                    <Route path="/exam-history" element={<ExamHistory />} />
                    <Route path="/words" element={<WeakWords />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/groq-stt-test" element={<GroqSttTest />} />
                    <Route path="/telc" element={<TELCApp />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
