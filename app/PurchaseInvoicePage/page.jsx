'use client';
import { useState, useEffect } from 'react';
import styles from './styles.module.css';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  where,
  query
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { IoMdAddCircle, IoMdClose } from 'react-icons/io';
import { FaTrashAlt, FaEdit } from 'react-icons/fa';
import SideBar from '@/components/SideBar/page';

export default function PurchaseInvoicePage() {
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [search, setSearch] = useState('');
  const [editInvoiceId, setEditInvoiceId] = useState(null);

  // 🔹 جلب المنتجات (اللي نوعها product فقط)
  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data.filter((item) => item.type === 'product'));
    };
    fetchProducts();
  }, []);

  // 🔹 جلب الفواتير
  useEffect(() => {
    const fetchInvoices = async () => {
      const querySnapshot = await getDocs(collection(db, 'purchaseInvoices'));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInvoices(data);
    };
    fetchInvoices();
  }, []);

  // 🔹 إضافة منتج للفاتورة
  const handleSelectProduct = (product) => {
    const existing = selectedItems.find((p) => p.id === product.id);

    if (existing) {
      const updated = selectedItems.map((p) =>
        p.id === product.id
          ? {
              ...p,
              newQuantity: (p.newQuantity || 0) + 1,
              quantity: (p.oldQuantity || 0) + (p.newQuantity || 0) + 1,
            }
          : p
      );
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          ...product,
          oldQuantity: product.quantity || 0,
          newQuantity: 1,
          quantity: (product.quantity || 0) + 1,
        },
      ]);
    }
  };

  // 🔹 حذف منتج من الفاتورة
  const handleRemoveProduct = (id) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  // 🔹 حفظ الفاتورة + تحديث الكميات في المنتجات
  const handleSaveInvoice = async () => {
    if (selectedItems.length === 0) return alert('اختر منتجات أولاً');

    const newInvoice = {
      items: selectedItems,
      date: new Date().toLocaleString(),
    };

    if (editInvoiceId) {
      await updateDoc(doc(db, 'purchaseInvoices', editInvoiceId), newInvoice);
      setEditInvoiceId(null);
    } else {
      await addDoc(collection(db, 'purchaseInvoices'), newInvoice);
    }



for (const item of selectedItems) {
  try {
    // نبحث عن المنتج حسب الكود أو الاسم لو عندك حقل اسمه code
    const q = query(collection(db, 'products'), where('code', '==', item.code));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const productDoc = querySnapshot.docs[0].ref;
      const productData = querySnapshot.docs[0].data();
      const updatedQuantity = (productData.quantity || 0) + (item.newQuantity || 0);

      await updateDoc(productDoc, { quantity: updatedQuantity });
    } else {
      console.error('المنتج غير موجود في قاعدة البيانات:', item.name);
    }
  } catch (error) {
    console.error('خطأ أثناء تحديث الكمية:', error);
  }
}



    setSelectedItems([]);
    setShowPopup(false);
    window.location.reload();
  };

  // 🔹 حذف فاتورة
  const handleDeleteInvoice = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف الفاتورة؟')) {
      await deleteDoc(doc(db, 'purchaseInvoices', id));
      setInvoices(invoices.filter((inv) => inv.id !== id));
    }
  };

  // 🔹 تعديل فاتورة
  const handleEditInvoice = (invoice) => {
    const itemsWithQuantities = invoice.items.map((item) => ({
      ...item,
      oldQuantity: item.oldQuantity || item.quantity || 0,
      newQuantity: 0,
      quantity: item.quantity || 0,
    }));
    setSelectedItems(itemsWithQuantities);
    setEditInvoiceId(invoice.id);
    setShowPopup(true);
  };

  // 🔹 تغيير الكمية الجديدة
  const handleChangeQuantity = (id, newQty) => {
    const updated = selectedItems.map((item) =>
      item.id === id
        ? {
            ...item,
            newQuantity: Number(newQty),
            quantity: (item.oldQuantity || 0) + Number(newQty),
          }
        : item
    );
    setSelectedItems(updated);
  };

  // 🔹 البحث عن المنتجات
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.actions}>
          <h1 className={styles.title}>فواتير المشتريات</h1>
          <button onClick={() => setShowPopup(true)} className={styles.addBtn}>
            <IoMdAddCircle size={20} /> إضافة فاتورة جديدة
          </button>
        </div>

        {/* 🧾 جدول الفواتير */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>عدد الأصناف</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.date}</td>
                <td>{inv.items.length}</td>
                <td>
                  <button
                    onClick={() => handleEditInvoice(inv)}
                    className={styles.editBtn}
                    title="تعديل"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(inv.id)}
                    className={styles.deleteBtn}
                    title="حذف"
                  >
                    <FaTrashAlt />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 🪟 Popup */}
        {showPopup && (
          <div className={styles.popupOverlay}>
            <div className={styles.popup}>
              <div className={styles.popupHeader}>
                <h2>{editInvoiceId ? 'تعديل فاتورة' : 'إضافة فاتورة جديدة'}</h2>
                <IoMdClose
                  onClick={() => {
                    setShowPopup(false);
                    setEditInvoiceId(null);
                    setSelectedItems([]);
                  }}
                  className={styles.closeIcon}
                />
              </div>

              <input
                type="text"
                placeholder="ابحث باسم المنتج..."
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className={styles.productsList}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={styles.productCard}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <h4>{product.name}</h4>
                    <p>الكمية القديمة: {product.quantity}</p>
                  </div>
                ))}
              </div>

              {selectedItems.length > 0 && (
                <div className={styles.selectedItems}>
                  <h3>المنتجات داخل الفاتورة</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الكمية القديمة</th>
                        <th>الكمية الجديدة</th>
                        <th>الكمية الإجمالية</th>
                        <th>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.oldQuantity || 0}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.newQuantity}
                              onChange={(e) =>
                                handleChangeQuantity(item.id, e.target.value)
                              }
                              className={styles.qtyInput}
                            />
                          </td>
                          <td>{item.quantity}</td>
                          <td>
                            <button
                              onClick={() => handleRemoveProduct(item.id)}
                              className={styles.deleteBtn}
                            >
                              <FaTrashAlt />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button onClick={handleSaveInvoice} className={styles.saveBtn}>
                حفظ الفاتورة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
