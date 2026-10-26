# Beacon Mart – Frontend

React 19 (Create React App) storefront and admin panel for the Beacon Mart order and inventory management system.

Full setup instructions (XAMPP, database, Stripe test keys, first admin) are in the backend README:
**[Capstone-project-backend](https://github.com/Yoona-art-2601/Capstone-project-backend#readme)**

## Quick start

The backend must run on XAMPP at `http://localhost/beaconmart-project/backend`, and this repo must be cloned next to it as `beaconmart-project/frontend`.

```bash
npm install
npm start
```

| Page | URL |
|---|---|
| Store | http://localhost:3000 |
| Cart and checkout | http://localhost:3000/cart |
| My Orders | http://localhost:3000/my-orders |
| My Account | http://localhost:3000/account |
| Store locations | http://localhost:3000/stores |
| Admin panel | http://localhost:3000/admin |

To use a different backend address, set `REACT_APP_API_URL` before starting, for example in a `.env.local` file:

```
REACT_APP_API_URL=http://localhost/beaconmart-project/backend
```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Development server on port 3000 |
| `npm test` | Unit tests (cart storage and phone validation) |
| `npm run build` | Production build in `build/` |

## Main files

| File | Purpose |
|---|---|
| `src/App.js` | Picks the page from the URL |
| `src/api.js` | API address and shared request helpers |
| `src/store.js` | Product grid, filters, branch picker, cart sidebar |
| `src/CartPage.js` | Delivery or pickup, address, time slot, payment |
| `src/MyOrders.js`, `src/AccountPage.js` | Customer orders, reviews, account and password |
| `src/Admin.js` | Admin shell: Orders, Inventory, Stock Transfers, Warehouse, Dashboard, Audit Trail |
| `src/cartStorage.js` | Cart saved per branch in localStorage |
| `DESIGN.md` | Design rules (colours, type, components) for new pages |
