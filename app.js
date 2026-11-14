// Массивы для хранения данных
let products = [];
let cart = [];

// Помощник для сохранения объектов/массивов в Cookies
function saveJsonCookie(name, data, days = 7) {
    const jsonStr = JSON.stringify(data);
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(jsonStr)}; expires=${date.toUTCString()}; path=/`;
}

// Помощник для чтения объектов/массивов из Cookies
function getJsonCookie(name) {
    const matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    if (matches) {
        try {
            return JSON.parse(decodeURIComponent(matches[1]));
        } catch (e) {
            return null;
        }
    }
    return null;
}

// 2. Получение товаров из базы данных (store_db.json)
async function loadProducts() {
    try {
        const response = await fetch('store_db.json');
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        
        products = await response.json();
        
        // Выводим полученные товары на страницу
        renderProducts(products);
        
        // 5. Восстанавливаем корзину из памяти (Cookies)
        const savedCart = getJsonCookie('shopping_cart');
        if (savedCart) {
            cart = savedCart;
            updateCartUI(); 
        }
    } catch (error) {
        console.error("Не удалось загрузить товары. Если сайт открыт как file:///, fetch заблокирован браузером:", error);
    }
}

// 3. Вывод товаров на страницу (адаптировано под Phantom Style и структуру категорий)
function renderProducts(productsList) {
    const container = document.getElementById('products-container');
    if (!container) return;

    container.innerHTML = ''; 

    productsList.forEach(product => {
        const cardHtml = `
            <article class="product-card">
                <span class="badge">NEW</span>
                <div class="product-img-placeholder" style="background: none; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${product.image}" alt="${product.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div> 
                <h4 class="product-name">${product.title}</h4>
                <p class="product-price">$${product.price}</p>
                <button class="add-to-bag-btn" onclick="addToCart(${product.id}, this)">ADD TO BAG</button>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// 4. Умное добавление товара в корзину
function addToCart(productId, buttonElement) {
    if (buttonElement && !buttonElement.classList.contains('added')) {
        buttonElement.classList.add('added');
        const originalText = buttonElement.textContent;
        buttonElement.textContent = '✓ ADDED';

        setTimeout(() => {
            buttonElement.classList.remove('added');
            buttonElement.textContent = originalText;
        }, 2000);
    }

    const existingProduct = cart.find(item => item.id === productId);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        const productData = products.find(p => p.id === productId);
        if (productData) {
            cart.push({
                id: productData.id,
                title: productData.title,
                price: productData.price,
                image: productData.image, 
                quantity: 1
            });
        }
    }

    saveJsonCookie('shopping_cart', cart);
    updateCartUI(); 
}

// Открытие и закрытие модального окна корзины
function toggleCart(isOpen) {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = isOpen ? 'flex' : 'none';
    }
}

// Изменение количества товара (+ или -) внутри модального окна
function changeQuantity(productId, delta) {
    const product = cart.find(item => item.id === productId);
    if (!product) return;

    product.quantity += delta;

    if (product.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
}

// Полное удаление товара из корзины
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
}

// 5. Динамическое обновление счетчика BAG и рендеринг списка
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counterElement = document.getElementById('cart-counter');
    if (counterElement) {
        counterElement.textContent = totalItems;
    }

    const itemsContainer = document.getElementById('cart-items-container');
    const totalPriceElement = document.getElementById('cart-total-price');
    
    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `<div class="empty-cart-msg">YOUR BAG IS EMPTY</div>`;
        if (totalPriceElement) totalPriceElement.textContent = "$0";
        return;
    }

    itemsContainer.innerHTML = '';
    let totalOrderPrice = 0;

    cart.forEach(item => {
        const itemTotalPrice = item.price * item.quantity;
        totalOrderPrice += itemTotalPrice;

        const itemHtml = `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.title}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.title}</h4>
                    <p class="cart-item-price">$${item.price}</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
                <span class="delete-item-btn" onclick="removeFromCart(${item.id})">&times;</span>
            </div>
        `;
        itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    if (totalPriceElement) {
        totalPriceElement.textContent = `$${totalOrderPrice}`;
    }
}

// Открытие окна оформления заказа при нажатии PROCEED TO CHECKOUT
function checkoutOrder() {
    if (cart.length === 0) {
        alert("YOUR BAG IS EMPTY!");
        return;
    }

    // Считаем общую сумму и передаем её в окно оплаты
    const totalOrderPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const checkoutTotalElement = document.getElementById('checkout-total-price');
    if (checkoutTotalElement) {
        checkoutTotalElement.textContent = `$${totalOrderPrice}`;
    }

    // Закрываем корзину и открываем форму заказа
    toggleCart(false);
    toggleCheckout(true);
}

// Управление видимостью окна оформления заказа
function toggleCheckout(isOpen) {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.style.display = isOpen ? 'flex' : 'none';
    }
}

// Обработка отправки формы заказа
function submitOrder(event) {
    event.preventDefault(); // Отменяем перезагрузку страницы

    alert("ORDER CONFIRMED! THE PHANTOM THIEVES WILL DELIVER IT SOON.");

    // Очищаем корзину, сохраняем в Cookies и сбрасываем форму
    cart = [];
    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
    document.getElementById('checkout-form').reset();
    toggleCheckout(false);
}

// Автоматическое форматирование номера карты (пробелы каждые 4 цифры) и срока действия (MM/YY)
const cardInput = document.getElementById('order-card');
if (cardInput) {
    cardInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
}

const expiryInput = document.getElementById('order-expiry');
if (expiryInput) {
    expiryInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
    });
}

// 6. Логика фильтрации товаров по клику на боковое меню
function filterProducts(categoryName) {
    // Очищаем поле поиска при выборе категории
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    if (categoryName === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(product => product.category === categoryName);
        renderProducts(filtered);
    }
}

// 7. Живой поиск товаров прямо в шапке сайта
const searchInput = document.getElementById('searchInput');

if (searchInput) {
    searchInput.addEventListener('input', function () {
        const cleanQuery = this.value.trim().toLowerCase();

        if (cleanQuery === "") {
            renderProducts(products);
            return;
        }

        const searchResults = products.filter(product =>
            product.title.toLowerCase().includes(cleanQuery)
        );

        if (searchResults.length > 0) {
            renderProducts(searchResults);
        } else {
            const container = document.getElementById('products-container');
            if (container) {
                container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; font-size: 1.5rem; padding: 40px;">NOTHING FOUND</p>`;
            }
        }
    });
}

// Запуск загрузки товаров при открытии страницы
loadProducts();
