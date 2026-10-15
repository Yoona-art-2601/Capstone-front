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

export function loadSavedCart(branchId) {
  const saved = read(CART_KEY);
  if (!saved || saved.branch_id !== branchId || !Array.isArray(saved.items)) return [];
  return saved.items;
}

export function saveCart(branchId, cart) {
  write(CART_KEY, {
    branch_id: branchId,
    items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
  });
}

export function clearSavedCart() {
  try {
    window.localStorage.removeItem(CART_KEY);
  } catch (e) {
    return;
  }
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
