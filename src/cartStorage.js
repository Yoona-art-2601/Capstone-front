const CART_KEY = 'beaconmart_cart';
const BRANCH_KEY = 'beaconmart_branch';

function read(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    return;
  }
}

export function loadSavedBranch() {
  const id = Number(read(BRANCH_KEY));
  return id > 0 ? id : null;
}

export function saveBranch(branchId) {
  write(BRANCH_KEY, branchId);
}

function readCarts() {
  const saved = read(CART_KEY);
  if (!saved || typeof saved !== 'object') return {};
  if (Array.isArray(saved.items)) return { [saved.branch_id]: saved.items };
  return saved.carts && typeof saved.carts === 'object' ? saved.carts : {};
}

export const CART_EVENT = 'beaconmart-cart-change';

function writeCarts(carts) {
  write(CART_KEY, { carts });
  window.dispatchEvent(new Event(CART_EVENT));
}

export function loadSavedCart(branchId) {
  const items = readCarts()[branchId];
  return Array.isArray(items) ? items : [];
}

export function saveCart(branchId, cart) {
  const carts = readCarts();
  if (cart.length) {
    carts[branchId] = cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }));
  } else {
    delete carts[branchId];
  }
  writeCarts(carts);
}

export function clearSavedCart(branchId = loadSavedBranch()) {
  const carts = readCarts();
  delete carts[branchId];
  writeCarts(carts);
}

export function savedCartCount(branchId) {
  return loadSavedCart(branchId).reduce((sum, item) => sum + item.quantity, 0);
}

export function rebuildCart(savedItems, products) {
  return savedItems
    .map(saved => {
      const product = products.find(p => p.product_id === saved.product_id);
      if (!product || product.stock <= 0) return null;
      return { ...product, quantity: Math.min(saved.quantity, product.stock) };
    })
    .filter(Boolean);
}

export function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return /^\+?[0-9\s-]+$/.test(phone.trim()) && digits.length >= 9 && digits.length <= 13;
}
