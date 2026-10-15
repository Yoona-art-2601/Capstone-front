import Store from './store';
import Admin from './Admin';
import MyOrders from './MyOrders';
import Stores from './Stores';
import InfoPage, { INFO_PATHS } from './InfoPage';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith('/admin')) return <Admin />;
  if (path.startsWith('/my-orders')) return <MyOrders />;
  if (path === '/stores') return <Stores />;
  if (INFO_PATHS.includes(path)) return <InfoPage path={path} />;
  return <Store />;
}

export default App;
