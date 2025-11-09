import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Example from './pages/Example';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard/>} />    
      <Route path="/example" element={<Example/>} />   
    </Routes>
  );
}

export default App;
