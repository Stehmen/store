/* АТЛАНТ — демо-магазин: каталог из JSON, корзина в localStorage */
const FALLBACK = { products: [
  { id: "demo", title: "Демо-товар", category: "Аксессуары", price: 10, rating: 5.0, reviews: 1, emoji: "🎽", badge: null }
]};

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("atlantCart") || "{}"), // {id: qty}
  category: "all",
  query: "",
  sort: "popular"
};

const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(n % 1 ? 2 : 0);
const byId = (id) => state.products.find((p) => p.id === id);

/* ---------- каталог ---------- */

async function loadProducts() {
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("fetch failed");
    state.products = (await res.json()).products;
  } catch {
    state.products = FALLBACK.products;
  }
  renderCategories();
  render();
}

function renderCategories() {
  const cats = ["all", ...new Set(state.products.map((p) => p.category))];
  $("categoryPills").innerHTML = cats.map((c) =>
    `<button type="button" class="pill${c === state.category ? " active" : ""}" data-cat="${c}">${c === "all" ? "Все" : c}</button>`
  ).join("");
  document.querySelectorAll(".pill").forEach((b) =>
    b.addEventListener("click", () => { state.category = b.dataset.cat; renderCategories(); render(); }));
}

function filtered() {
  let list = state.products.filter((p) =>
    (state.category === "all" || p.category === state.category) &&
    p.title.toLowerCase().includes(state.query));
  const sorts = {
    "popular": (a, b) => b.reviews - a.reviews,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "rating": (a, b) => b.rating - a.rating
  };
  return list.sort(sorts[state.sort]);
}

function stars(r) {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function render() {
  const list = filtered();
  $("grid").innerHTML = list.map((p) => `
    <article class="card">
      <div class="tile">${p.emoji}${p.badge ? `<span class="badge">${p.badge}</span>` : ""}</div>
      <div class="card-body">
        <h3>${p.title}</h3>
        <div class="category">${p.category}</div>
        <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} (${p.reviews})</div>
        <div class="price-row">
          <span class="price">${money(p.price)}</span>
          ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
        </div>
        <button type="button" class="add-btn" data-id="${p.id}">В корзину</button>
      </div>
    </article>`).join("");
  $("emptyMsg").classList.toggle("hidden", list.length > 0);
  document.querySelectorAll(".add-btn").forEach((b) =>
    b.addEventListener("click", () => addToCart(b.dataset.id)));
  updateCartBadge();
}

$("searchInput").addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});
$("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

/* ---------- корзина ---------- */

function saveCart() {
  localStorage.setItem("atlantCart", JSON.stringify(state.cart));
}

function cartCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}

function cartTotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const p = byId(id);
    return p ? sum + p.price * qty : sum;
  }, 0);
}

function updateCartBadge() {
  $("cartCount").textContent = cartCount();
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  updateCartBadge();
  toast("Добавлено в корзину");
  if (!$("cartDrawer").classList.contains("hidden")) renderCartItems();
}

function setQty(id, qty) {
  if (qty <= 0) delete state.cart[id];
  else state.cart[id] = qty;
  saveCart();
  updateCartBadge();
  renderCartItems();
}

function renderCartItems() {
  const entries = Object.entries(state.cart);
  if (!entries.length) {
    $("cartItems").innerHTML = `<p class="cart-empty">Корзина пуста.<br>Загляните в каталог — там хорошо.</p>`;
  } else {
    $("cartItems").innerHTML = entries.map(([id, qty]) => {
      const p = byId(id);
      if (!p) return "";
      return `
      <div class="cart-item">
        <div class="cart-thumb">${p.emoji}</div>
        <div class="cart-info">
          <h4>${p.title}</h4>
          <div class="price">${money(p.price)}</div>
          <div class="qty">
            <button type="button" data-act="dec" data-id="${id}" aria-label="Меньше">−</button>
            <span>${qty}</span>
            <button type="button" data-act="inc" data-id="${id}" aria-label="Больше">+</button>
          </div>
          <button type="button" class="remove" data-act="rm" data-id="${id}">Убрать</button>
        </div>
      </div>`;
    }).join("");
  }
  $("cartTotal").textContent = money(cartTotal());
  $("checkoutBtn").disabled = !entries.length;
  document.querySelectorAll("#cartItems button[data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      const qty = state.cart[id] || 0;
      if (b.dataset.act === "inc") setQty(id, qty + 1);
      else if (b.dataset.act === "dec") setQty(id, qty - 1);
      else setQty(id, 0);
    }));
}

function openDrawer(which) {
  $(which).classList.remove("hidden");
  $("overlay").classList.remove("hidden");
}
function closeDrawers() {
  ["cartDrawer", "checkoutPanel"].forEach((id) => $(id).classList.add("hidden"));
  $("overlay").classList.add("hidden");
}

$("cartBtn").addEventListener("click", () => { renderCartItems(); openDrawer("cartDrawer"); });
$("cartClose").addEventListener("click", closeDrawers);
$("overlay").addEventListener("click", closeDrawers);

/* ---------- оформление ---------- */

$("checkoutBtn").addEventListener("click", () => {
  if (!cartCount()) return;
  $("checkoutTotal").textContent = money(cartTotal());
  closeDrawers();
  openDrawer("checkoutPanel");
});
$("checkoutClose").addEventListener("click", closeDrawers);

$("checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = "ATL-" + Math.floor(100000 + Math.random() * 900000);
  $("orderNumber").textContent = num;
  state.cart = {};
  saveCart();
  updateCartBadge();
  closeDrawers();
  $("orderSuccess").classList.remove("hidden");
  e.target.reset();
});
$("successClose").addEventListener("click", () => {
  $("orderSuccess").classList.add("hidden");
  render();
});

/* ---------- тост ---------- */

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 1800);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawers(); $("orderSuccess").classList.add("hidden"); }
});

loadProducts();
