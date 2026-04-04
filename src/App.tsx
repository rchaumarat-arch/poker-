import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { Layout } from './components/layout/Layout';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/groups/:groupId" element={<GroupPage />} />
            <Route path="/games/:gameId" element={<GamePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}
