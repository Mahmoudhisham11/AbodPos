'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import { CiSearch } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { GoNumber } from "react-icons/go";
import { MdOutlineEdit } from "react-icons/md";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";

function Products() {
  const [active, setActive] = useState(false); // false = عرض المنتجات, true = إضافة, "edit" = تعديل
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchCode, setSearchCode] = useState("");
  const [totalBuy, setTotalBuy] = useState(0);
  const [totalSell, setTotalSell] = useState(0);

  const [form, setForm] = useState({
    name: "",
    buyPrice: "",
    sellPrice: "",
    quantity: "",
  });

  const [editId, setEditId] = useState(null); // ✅ ID المنتج اللي بيتعدل

  useEffect(() => {
    const shop = localStorage.getItem("shop");
    if (!shop) return;

    const q = query(collection(db, "products"), where("shop", "==", shop), where("type", "==", "product"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);

      // حساب الإجماليات
      let totalBuyAmount = 0;
      let totalSellAmount = 0;
      data.forEach((product) => {
        totalBuyAmount += (product.buyPrice || 0) * (product.quantity || 1);
        totalSellAmount += (product.sellPrice || 0) * (product.quantity || 1);
      });
      setTotalBuy(totalBuyAmount);
      setTotalSell(totalSellAmount);

      if (searchCode.trim()) {
        const filtered = data.filter((p) =>
          p.name?.toLowerCase().includes(searchCode.trim().toLowerCase())
        );
        setFilteredProducts(filtered);
      } else {
        setFilteredProducts(data);
      }
    });

    return () => unsubscribe();
  }, [searchCode]);

  const getNextCode = async () => {
    const shop = localStorage.getItem("shop");
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1000;

    const codes = snapshot.docs
      .map(doc => Number(doc.data().code))
      .filter(code => !isNaN(code));

    const maxCode = Math.max(...codes);
    return maxCode + 1;
  };

  const handleAddProduct = async () => {
    const shop = localStorage.getItem("shop");

    if (!form.name || !form.buyPrice || !form.sellPrice || !form.quantity) {
      alert("❗️يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const newCode = await getNextCode();

    await addDoc(collection(db, "products"), {
      code: newCode,
      name: form.name,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      quantity: Number(form.quantity),
      date: Timestamp.now(),
      shop: shop,
      type: "product"
    });

    alert("✅ تم إضافة المنتج");
    setForm({ name: "", buyPrice: "", sellPrice: "", quantity: "" });
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
      console.error("❌ خطأ أثناء الحذف:", err);
    }
  };

  // ✅ تجهيز بيانات المنتج للتعديل
  const handleEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      quantity: product.quantity,
    });
    setActive("edit"); // افتح فورم التعديل
  };

  const handlePrintLabel = (product) => {
    const printWindow = window.open('', '', 'width=400,height=300');
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @media print {
              @page {
                size: auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            .label {
              width: 100%;
              height: 100%;
              box-sizing: border-box;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              font-family: Arial, sans-serif;
              font-size: 8pt;
              gap: 1mm;
              page-break-inside: avoid;
              overflow: hidden;
              text-align: center;
            }
            .name {
              max-width: 100%;
              font-weight: 600;
              line-height: 1.1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .content {
              display: flex;
              gap: 2mm;
              flex-wrap: wrap;
              justify-content: center;
              align-items: center;
              font-size: 7pt;
            }
            /* حجم الباركود أكبر شوي */
            svg.barcode {
              width: 40mm;
              height: 12mm;/* ✅ زودنا الارتفاع */
            }
            .barcode rect, .barcode path { shape-rendering: crispEdges; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name ?? ''}</div>
            <div class="content">
              <div><strong>سعر البيع:</strong> ${product.sellPrice ?? ''} EGP</div>
              <div><strong>الكود:</strong> ${product.code ?? ''}</div>
            </div>
            <svg id="barcode" class="barcode"></svg>
          </div>

          <script>
            window.onload = function () {
              JsBarcode("#barcode", "${'${product.code}'}", {
                format: "CODE128",
                displayValue: false,
                margin: 0
              });
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ✅ تحديث المنتج
  const handleUpdateProduct = async () => {
    if (!editId) return;

    try {
      const productRef = doc(db, "products", editId);
      await updateDoc(productRef, {
        name: form.name,
        buyPrice: Number(form.buyPrice),
        sellPrice: Number(form.sellPrice),
        quantity: Number(form.quantity),
      });
      alert("✅ تم تحديث المنتج");
      setEditId(null);
      setForm({ name: "", buyPrice: "", sellPrice: "", quantity: "" });
      setActive(false);
    } catch (err) {
      console.error("❌ خطأ أثناء التحديث:", err);
    }
  };

  return (
    <div className={styles.products}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => { setActive(false); setEditId(null); }}>كل المنتجات</button>
          <button onClick={() => { setActive(true); setEditId(null); }}>اضف منتج جديد</button>
        </div>

        {/* عرض المنتجات */}
        <div className={styles.phoneContainer} style={{ display: active ? "none" : "flex" }}>
          <div className={styles.searchBox}>
            <div className="inputContainer">
              <label><CiSearch /></label>
              <input
                type="text"
                list="code"
                placeholder="ابحث بالاسم"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
              <datalist id="code">
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.totals}>
            <p>اجمالي الشراء: {totalBuy} EGP</p>
            <p>اجمالي البيع: {totalSell} EGP</p>
          </div>

          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>سعر الشراء</th>
                  <th>سعر البيع</th>
                  <th>الكمية</th>
                  <th>التاريخ</th>
                  <th>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.buyPrice} EGP</td>
                    <td>{product.sellPrice} EGP</td>
                    <td>{product.quantity}</td>
                    <td>{product.date?.toDate().toLocaleDateString("ar-EG")}</td>
                    <td className={styles.actions}>
                      <button onClick={() => handleDelete(product.id)}>
                        <FaRegTrashAlt />
                      </button>
                      <button onClick={() => handleEdit(product)}>
                        <MdOutlineEdit />
                      </button>
                      <button onClick={() => handlePrintLabel(product)}>
                        🖨️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* إضافة أو تعديل منتج */}
        {(active === true || active === "edit") && (
          <div className={styles.addContainer}>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><MdDriveFileRenameOutline /></label>
                <input
                  type="text"
                  placeholder="اسم المنتج"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><GiMoneyStack /></label>
                <input
                  type="number"
                  placeholder="سعر الشراء"
                  value={form.buyPrice}
                  onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                />
              </div>
              <div className="inputContainer">
                <label><GiMoneyStack /></label>
                <input
                  type="number"
                  placeholder="سعر البيع"
                  value={form.sellPrice}
                  onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><GoNumber /></label>
                <input
                  type="number"
                  placeholder="الكمية"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            </div>
            {active === "edit" ? (
              <button className={styles.addBtn} onClick={handleUpdateProduct}>
                تحديث المنتج
              </button>
            ) : (
              <button className={styles.addBtn} onClick={handleAddProduct}>
                اضف المنتج
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;
