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
                <button class="add-to-bag-btn" onclick="addToCart(${product.id})">ADD TO BAG</button>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// 4. Умная добавление товара в корзину (сохраняет ссылку на картинку для попапа)
function addToCart(productId) {
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

    // Сохраняем изменения в Cookies и перерисовываем интерфейс
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

    // Если количество упало до нуля, полностью убираем позицию
    if (product.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
}

// Полное удаление товара из корзины по нажатию на крестик
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
}

// 5. Динамическое обновление счетчика BAG и рендеринг списка внутри модального окна
function updateCartUI() {
    // 1. Обновляем цифру на главной кнопке в хедере
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counterElement = document.getElementById('cart-counter');
    if (counterElement) {
        counterElement.textContent = totalItems;
    }

    // 2. Находим узлы контейнера списка товаров и итоговой цены в попапе
    const itemsContainer = document.getElementById('cart-items-container');
    const totalPriceElement = document.getElementById('cart-total-price');
    
    if (!itemsContainer) return;

    // Если корзина очищена
    if (cart.length === 0) {
        itemsContainer.innerHTML = `<div class="empty-cart-msg">YOUR BAG IS EMPTY</div>`;
        if (totalPriceElement) totalPriceElement.textContent = "$0";
        return;
    }

    itemsContainer.innerHTML = '';
    let totalOrderPrice = 0;

    // Генерируем строки товаров с кнопками управления количеством и удалением
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

// Симуляция клика по оплате (очистка корзины после успешного оформления)
function checkoutOrder() {
    if (cart.length === 0) return;
    alert("ORDER PROCEEDED! THE PHANTOM THIEVES WILL DELIVER IT.");
    cart = [];
    saveJsonCookie('shopping_cart', cart);
    updateCartUI();
    toggleCart(false);
}

// 6. Логика фильтрации товаров по клику на боковое меню
function filterProducts(categoryName) {
    if (categoryName === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(product => product.category === categoryName);
        renderProducts(filtered);
    }
}

// 7. Функция для поиска товаров по названию
function searchProducts() {
    const searchQuery = prompt("Введите название товара для поиска:");
    if (searchQuery === null) return;
    
    const cleanQuery = searchQuery.trim().toLowerCase();
    
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
            container.innerHTML = `
                <div style="color: #fff; font-family: monospace; font-size: 20px; padding: 20px; text-transform: uppercase; grid-column: 1/-1; text-align: center;">
                    NOTHING FOUND... THE PHANTOMS TOOK IT!
                </div>
            `;
        }
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', loadProducts);
