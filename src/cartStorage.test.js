import { loadSavedCart, saveCart, clearSavedCart, saveBranch, rebuildCart, savedCartCount, isValidPhone } from './cartStorage';

beforeEach(() => window.localStorage.clear());

test('keeps a separate cart for each branch', () => {
  saveCart(1, [{ product_id: 5, quantity: 2 }]);
  saveCart(2, [{ product_id: 7, quantity: 1 }]);
  expect(loadSavedCart(1)).toEqual([{ product_id: 5, quantity: 2 }]);
  expect(loadSavedCart(2)).toEqual([{ product_id: 7, quantity: 1 }]);
  expect(savedCartCount(1)).toBe(2);
});

test('clearing one branch keeps the other branch cart', () => {
  saveCart(1, [{ product_id: 5, quantity: 2 }]);
  saveCart(2, [{ product_id: 7, quantity: 1 }]);
  clearSavedCart(1);
  expect(loadSavedCart(1)).toEqual([]);
  expect(loadSavedCart(2)).toHaveLength(1);
});

test('clearSavedCart defaults to the saved branch', () => {
  saveBranch(2);
  saveCart(2, [{ product_id: 7, quantity: 1 }]);
  clearSavedCart();
  expect(loadSavedCart(2)).toEqual([]);
});

test('reads carts saved in the old single-branch format', () => {
  window.localStorage.setItem('beaconmart_cart', JSON.stringify({ branch_id: 1, items: [{ product_id: 3, quantity: 4 }] }));
  expect(loadSavedCart(1)).toEqual([{ product_id: 3, quantity: 4 }]);
  expect(loadSavedCart(2)).toEqual([]);
});

test('rebuildCart drops sold out products and caps quantity at stock', () => {
  const products = [
    { product_id: 1, name: 'A', stock: 3 },
    { product_id: 2, name: 'B', stock: 0 }
  ];
  const cart = rebuildCart([{ product_id: 1, quantity: 5 }, { product_id: 2, quantity: 1 }, { product_id: 9, quantity: 1 }], products);
  expect(cart).toEqual([{ product_id: 1, name: 'A', stock: 3, quantity: 3 }]);
});

test('validates Malaysian phone numbers', () => {
  expect(isValidPhone('012-345 6789')).toBe(true);
  expect(isValidPhone('+6012 345 6789')).toBe(true);
  expect(isValidPhone('12345')).toBe(false);
  expect(isValidPhone('abc-def-ghij')).toBe(false);
});
