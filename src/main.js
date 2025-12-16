/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const discount = 1 - (purchase.discount / 100);
   const revenue = purchase.sale_price * purchase.quantity * discount;
   return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index == 0) {
    return seller.profit * 15 / 100;
    } else if (index == 1 || index == 2) {
        return seller.profit * 10 / 100;
    } else if (index == total - 1) {
        return 0;
    } else { // Для всех остальных
        return seller.profit * 5 / 100;
    } 
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные (data) должны быть объектом');
    }
    const requiredCollections = ['sellers', 'products', 'purchase_records'];
    for (const collection of requiredCollections) {
        if (!Array.isArray(data[collection])) {
            throw new Error(`В данных отсутствует или не является массивом: ${collection}`);
        }
        if (data[collection].length === 0) {
            throw new Error(`Массив ${collection} не должен быть пустым`);
        }
    }
    // @TODO: Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Параметр options должен быть объектом');
    }
    if (typeof options.calculateRevenue !== 'function') {
        throw new Error('В options должна быть функция calculateRevenue');
    }
    if (typeof options.calculateBonus !== 'function') {
        throw new Error('В options должна быть функция calculateBonus');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const { calculateRevenue, calculateBonus } = options;

    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id, // Идентификатор продавца
        name: seller.first_name + ' ' + seller.last_name, // Имя и фамилия продавца
        revenue: 0, // Общая выручка с учётом скидок
        profit: 0, // Прибыль от продаж продавца
        sales_count: 0, // Количество продаж
        products_sold: {},
       
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(item => [item.seller_id, item]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));
    
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        // Увеличить количество продаж 
        seller.sales_count += 1;
        // Увеличить общую сумму всех продаж

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const revenue = calculateRevenue(item, product);
            seller.revenue = +(seller.revenue + revenue).toFixed(2);
            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;
            // Увеличить общую накопленную прибыль (profit) у продавца  
            seller.profit += profit; 

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    // Для сортировки по УБЫВАНИЮ (от большего к меньшему):
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);// Считаем бонус
        seller.top_products = Object.entries(seller.products_sold);// Формируем топ-10 товаров
        seller.top_products = seller.top_products.map(([sku, quantity]) => ({ sku, quantity }))
        seller.top_products.sort((a, b) => b.quantity - a.quantity);
        seller.top_products = seller.top_products.slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,// Строка, идентификатор продавца
        name: seller.name,// Строка, имя продавца
        revenue: +(seller.revenue).toFixed(2),// Число с двумя знаками после точки, выручка продавца
        profit: +(seller.profit).toFixed(2),// Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count,// Целое число, количество продаж продавца
        top_products: seller.top_products,// Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +(seller.bonus).toFixed(2),// Число с двумя знаками после точки, бонус продавца
    }));
}