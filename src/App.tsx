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
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
