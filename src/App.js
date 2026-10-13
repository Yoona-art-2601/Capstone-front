import Store from './store';
import Admin from './Admin';
import MyOrders from './MyOrders';

function App() {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return <Admin />;
  if (path.startsWith('/my-orders')) return <MyOrders />;
  return <Store />;
}

export default App;
