import Store from './store';
import Admin from './Admin';

function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  return isAdmin ? <Admin /> : <Store />;
}

export default App;