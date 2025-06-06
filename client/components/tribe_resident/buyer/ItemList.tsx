"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faDollarSign, faSortAmountDown } from '@fortawesome/free-solid-svg-icons';
import PaginationDemo from "@/components/tribe_resident/buyer/PaginationDemo";
import { Button } from "@/components/ui/button";
import { Product } from '@/interfaces/tribe_resident/buyer/buyer';  
import { ItemListProps } from '@/interfaces/tribe_resident/buyer/buyer';

/**
 * Renders a list of items with pagination and sorting functionality.
 *
 * @param products - The array of products to display.
 * @param itemsPerPage - The number of items to display per page.
 * @param addToCart - The function to add a product to the cart.
 */
const ItemList: React.FC<ItemListProps> = ({ products, itemsPerPage, addToCart }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortedProducts, setSortedProducts] = useState<Product[]>(products);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [addedMessage, setAddedMessage] = useState<string | null>(null); // State for notification message

  useEffect(() => {
    // Sort the products based on the current sort order.
    const sorted = [...products].sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
    setSortedProducts(sorted);
  }, [products, sortOrder]);

  /**
   * Handles the page change event.
   *
   * @param page - The new page number.
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  /**
   * Toggles the sort order between ascending and descending.
   */
  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentData = sortedProducts.slice(startIdx, endIdx);

  return (
    <div className="relative">
      <div className="flex justify-end mb-4">
        <Button onClick={toggleSortOrder}>
          <FontAwesomeIcon icon={faSortAmountDown} className="mr-2" />
          {sortOrder === 'asc' ? '價格由小到大' : '價格由大到小'}
        </Button>
      </div>

      {/* Notification Overlay */}
      {addedMessage && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          aria-live="assertive"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="text-lg font-semibold text-green-700">{addedMessage}</p>
            <Button 
              className="mt-4 bg-green-600 text-white"
              onClick={() => setAddedMessage(null)}
            >
              關閉
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentData.map((product) => (
          <div key={product.id} className="card p-4 bg-white shadow-md rounded-lg">
            {/* Conditional Image Rendering */}
            <img 
              src={
                product.category === "小木屋鬆餅" || product.category === "金鰭" || product.category === "原丼力"
                  ? `/test/${encodeURIComponent(product.img)}` // Local image from the public folder
                  : `https://www.cloudtribe.site${product.img}` // Online image URL
              }
              alt={product.name}
              width={250}
              height={250}
              className="object-cover mx-auto"
              style={{ objectFit: 'contain' }}
            />
            <div className="p-4 text-center">
              <h2
                className="text-xl font-bold mb-2"
                style={{ height: '3rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {product.name}
              </h2>
              <p className="text-2xl font-bold text-red-500 mb-4">參考價格: {Math.floor(product.price)} 元</p>
              <div className="flex justify-center items-center mb-4">
                <label htmlFor={`quantity-${product.id}`} className="mr-2">購買數量:</label>
                <input
                  type="number"
                  id={`quantity-${product.id}`}
                  className="w-16 text-center border rounded"
                  defaultValue={1}
                  min={1}
                />
              </div>
              <div className="flex flex-col items-center">
                {/* Add to cart button */}
                <Button
                  className="flex items-center justify-center mb-2"
                  onClick={() => {
                    const quantityInput = document.getElementById(`quantity-${product.id}`) as HTMLInputElement;
                    const quantity = parseInt(quantityInput?.value || '1', 10);

                    if (quantity > 0) {
                      addToCart(product, quantity);
                      setAddedMessage(`${product.name} (${quantity} 件) 已經加入購物車`); // 包含商品件數的通知訊息

                      // Clear the quantity input
                      setTimeout(() => setAddedMessage(null), 2000);
                    } else {
                      setAddedMessage("購買數量必須大於 0");
                      setTimeout(() => setAddedMessage(null), 2000);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
                  加入購物車
                </Button>
                {/* Product link to check the actual price */}
                <a 
                  href={`https://online.carrefour.com.tw/zh/search/?q=${encodeURIComponent(product.name.replace(/\(.*?\)|※.*$|因.*$/g, '').trim())}`}   
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4"
                >
                  <Button className="flex items-center justify-center">
                    <FontAwesomeIcon icon={faDollarSign} className="mr-2" /> {/* 金錢 icon */}
                    商品連結(目前的實際價格)
                  </Button>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <PaginationDemo
        totalItems={products.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default ItemList;
