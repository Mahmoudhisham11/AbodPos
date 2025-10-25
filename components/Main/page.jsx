'use client';
import SideBar from "../SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { IoMdSearch } from "react-icons/io";
import { CiShoppingCart } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoIosCloseCircle } from "react-icons/io";
import { FaUser } from "react-icons/fa";
import { FaPhone } from "react-icons/fa";
import { FaBars } from "react-icons/fa6";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, getDoc, writeBatch
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { useRouter } from "next/navigation";

function Main() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [employess, setEmployess] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [savePage, setSavePage] = useState(false);
  const [openSideBar, setOpenSideBar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customPrices, setCustomPrices] = useState({});
  const [searchCode, setSearchCode] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dailySales, setDailySales] = useState([]);
  const [showClientPopup, setShowClientPopup] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchClient, setSearchClient] = useState("");

  // NEW: discount popup & values
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [discountInput, setDiscountInput] = useState(0);
  const [discountNotes, setDiscountNotes] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const nameRef = useRef();
  const phoneRef = useRef();
  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "dailySales"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDailySales(data);
    });
    return () => unsubscribe();
  }, [shop]);

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, [shop]);

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "cart"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCart(data);
    });
    return () => unsubscribe();
  }, [shop]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageUserName = localStorage.getItem("userName");
      if (!storageUserName) return;
      const q = query(collection(db, 'users'), where('userName', '==', storageUserName));
      const unsubscribe = onSnapshot(q, (snapShot) => {
        if (snapShot.empty) return;
        const data = snapShot.docs[0].data();
        if (data.isSubscribed === false) {
          alert('لقد تم اغلاق الحساب برجاء التواصل مع المطور');
          localStorage.clear();
          window.location.reload();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, 'employees'), where('shop', '==', shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEmployess(data);
    });
    return () => unsubscribe();
  }, [shop]);

  const handleAddToCart = async (product) => {
    let cartData = {
      name: product.name,
      sellPrice: Number(customPrices[product.id]) || product.sellPrice,
      productPrice: product.sellPrice,
      quantity: 1,
      type: product.type,
      total: Number(customPrices[product.id]) || product.sellPrice,
      date: new Date(),
      shop: shop,
    };

    if (product.type === "phone") {
      cartData = {
        ...cartData,
        battery: product.battery || "80",
        buyPrice: product.buyPrice || 1000,
        code: product.code,
        color: product.color || "ابيض",
        condition: product.condition || "مستعمل",
        includedItems: product.includedItems || ["الكارتونة", "الشاحن", "السماعة"],
        notes: product.notes || "كسر ففي الشاشة",
        owner: product.owner || "سعيد",
        ownerNumber: product.ownerNumber || "0109702654",
        ram: product.ram || "8",
        serial: product.serial || "1234565165621651",
        sim: product.sim || "3",
        storage: product.storage || "128",
        tax: product.tax || "بضريبة",
        taxValue: product.taxValue || 1000,
      };
    } else {
      cartData = {
        ...cartData,
        buyPrice: product.buyPrice || 0,
        code: product.code,
      };
    }

    await addDoc(collection(db, "cart"), cartData);

    setCustomPrices(prev => {
      const updated = { ...prev };
      delete updated[product.id];
      return updated;
    });
  };

  const handleQtyChange = async (cartItem, delta) => {
    const newQty = cartItem.quantity + delta;
    if (newQty < 1) return;
    const newTotal = newQty * cartItem.sellPrice;
    await updateDoc(doc(db, "cart", cartItem.id), {
      quantity: newQty,
      total: newTotal,
    });
  };

  const handleDeleteCartItem = async (id) => {
    await deleteDoc(doc(db, "cart", id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * (item.quantity || 1)), 0);
  const profit = cart.reduce((acc, item) => {
    const buy = Number(item.buyPrice || 0);
    const sell = Number(item.sellPrice || 0);
    const qty = Number(item.quantity || 1);
    return acc + ((sell - buy) * qty);
  }, 0);
  const finalTotal = Math.max(0, subtotal - appliedDiscount);

  const filteredProducts = products.filter((p) => {
  const search = searchCode.trim().toLowerCase();
  const matchCode = p.code?.toString().toLowerCase().includes(search);
  const matchName = p.name?.toLowerCase().includes(search);
  const matchType =
    filterType === "all"
      ? true
      : filterType === "phone"
        ? p.type === "phone"
        : p.type !== "phone";
  return (matchCode || matchName) && matchType;
});


  const phonesCount = products.filter(p => p.type === "phone").length;
  const otherCount = products.filter(p => p.type !== "phone").length;

  useEffect(() => {
    if (!searchCode || !shop) return;

    const timer = setTimeout(async () => {
      const foundProduct = products.find(p => p.code?.toString() === searchCode.trim());
      if (foundProduct) {
        const alreadyInCart = cart.some(item => item.code === foundProduct.code);
        if (!alreadyInCart) {
          await handleAddToCart(foundProduct);
          setSearchCode("");
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchCode, products, cart, shop]);

  const handleApplyDiscount = () => {
    const numeric = Number(discountInput) || 0;
    if (numeric < 0) {
      alert('الخصم لا يمكن أن يكون قيمة سالبة');
      return;
    }
    if (numeric > subtotal) {
      const ok = window.confirm('الخصم أكبر من إجمالي الفاتورة، هل تريد تطبيقه؟');
      if (!ok) return;
    }
    setAppliedDiscount(Math.min(numeric, subtotal));
    setShowDiscountPopup(false);
  };

  const handleClearDiscount = () => {
    setAppliedDiscount(0);
    setDiscountInput(0);
    setDiscountNotes("");
  };

  const totalAmount = subtotal;

  const handleSaveReport = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const clientName = nameRef.current?.value || "";
    const phone = phoneRef.current?.value || "";

    if (cart.length === 0) {
      alert("يرجى إضافة منتجات إلى السلة قبل الحفظ");
      setIsSaving(false);
      return;
    }

    try {
      // تحديث أو حذف المنتجات من المخزن
      for (const item of cart) {
        const q = query(
          collection(db, "products"),
          where("code", "==", item.code),
          where("shop", "==", shop)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const productDoc = snapshot.docs[0];
          const productData = productDoc.data();
          const productRef = productDoc.ref;
          const availableQty = productData.quantity || 0;
          const sellQty = item.quantity;

          if (sellQty > availableQty) {
            alert(`الكمية غير كافية للمنتج: ${item.name}`);
            setIsSaving(false);
            return;
          } else if (sellQty === availableQty) {
            await deleteDoc(productRef);
          } else {
            await updateDoc(productRef, {
              quantity: availableQty - sellQty,
            });
          }
        }
      }

      const computedSubtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
      const computedProfit = cart.reduce((sum, item) => sum + ((item.sellPrice - (item.buyPrice || 0)) * item.quantity), 0);
      const computedFinalTotal = Math.max(0, computedSubtotal - appliedDiscount);

      const saleData = {
        cart,
        clientName,
        phone,
        subtotal: computedSubtotal,
        discount: appliedDiscount,
        discountNotes: discountNotes,
        total: computedFinalTotal,
        profit: computedProfit,
        date: new Date(),
        shop,
        employee: selectedEmployee || "غير محدد",
      };

      await addDoc(collection(db, "dailySales"), saleData);
      await addDoc(collection(db, "employeesReports"), saleData);

      if (typeof window !== "undefined") {
        localStorage.setItem("lastInvoice", JSON.stringify({
          cart,
          clientName,
          phone,
          subtotal: computedSubtotal,
          discount: appliedDiscount,
          discountNotes: discountNotes,
          total: computedFinalTotal,
          profit: computedProfit,
          length: cart.length,
          date: new Date(),
        }));
      }

      // مسح السلة بعد الحفظ
      const qCart = query(collection(db, "cart"), where('shop', '==', shop));
      const cartSnapshot = await getDocs(qCart);
      for (const docSnap of cartSnapshot.docs) {
        await deleteDoc(docSnap.ref);
      }

      alert("تم حفظ التقرير بنجاح");

      // إعادة ضبط الخصم
      setAppliedDiscount(0);
      setDiscountInput(0);
      setDiscountNotes("");

    } catch (error) {
      console.error("حدث خطأ أثناء حفظ التقرير:", error);
      alert("حدث خطأ أثناء حفظ التقرير");
    }

    setIsSaving(false);
    setSavePage(false);
    setShowClientPopup(false);
    router.push('/resete');
  };

  const handleCloseDay = async () => {
  try {
    const q = query(collection(db, "dailySales"), where("shop", "==", shop));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("لا يوجد عمليات لتقفيلها اليوم");
      return;
    }

    // استخدم Batch لتجميع العمليات لتحسين الأداء
    const batch = writeBatch(db);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // أضف الوثيقة إلى مجموعة التقارير (reports) باستخدام Batch
      const reportRef = doc(collection(db, "reports"));
      batch.set(reportRef, data);

      // احذف مستند dailySales الأصلي من خلال Batch
      batch.delete(docSnap.ref);
    }

    // نفذ كل العمليات دفعة واحدة
    await batch.commit();

    alert("تم تقفيل اليوم بنجاح ✅");
  } catch (error) {
    console.error("خطأ أثناء تقفيل اليوم:", error);
    alert("حدث خطأ أثناء تقفيل اليوم");
  }
};


  const handleDeleteInvoice = async () => {
    if (!shop) return;
    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف الفاتورة بالكامل؟");
    if (!confirmDelete) return;
    try {
      const q = query(collection(db, "cart"), where("shop", "==", shop));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("لا توجد منتجات في الفاتورة لحذفها.");
        return;
      }
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      handleClearDiscount();
      alert("تم حذف الفاتورة بالكامل بنجاح ✅");
    } catch (error) {
      console.error("حدث خطأ أثناء حذف الفاتورة:", error);
      alert("حدث خطأ أثناء حذف الفاتورة ❌");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  };

  const filteredInvoices = dailySales.filter(inv =>
    inv.clientName?.toLowerCase().includes(searchClient.toLowerCase())
  );

  const totalSales = filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const employeeSales = {};
  filteredInvoices.forEach((invoice) => {
    if (invoice.employee && invoice.employee !== "غير محدد") {
      employeeSales[invoice.employee] = (employeeSales[invoice.employee] || 0) + invoice.total;
    }
  });
  const topEmployee =
    Object.entries(employeeSales).sort((a, b) => b[1] - a[1])[0]?.[0] || "لا يوجد موظفين";

  const handleReturnProduct = async (item, invoiceId) => {
    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        where("code", "==", item.code),
        where("shop", "==", item.shop)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        const existingData = snapshot.docs[0].data();
        const updatedQuantity = existingData.quantity + item.quantity;
        await updateDoc(docRef, { quantity: updatedQuantity });
      } else {
        await addDoc(collection(db, "products"), item);
      }

      const invoiceRef = doc(db, "dailySales", invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (invoiceSnap.exists()) {
        const invoiceData = invoiceSnap.data();
        const updatedCart = invoiceData.cart.filter((p) => p.code !== item.code);

        if (updatedCart.length > 0) {
          const newTotal = updatedCart.reduce(
            (sum, p) => sum + (p.sellPrice * p.quantity || 0),
            0
          );
          const newProfit = updatedCart.reduce(
            (sum, p) => sum + ((p.sellPrice - (p.buyPrice || 0)) * (p.quantity || 1)),
            0
          );
          await updateDoc(invoiceRef, {
            cart: updatedCart,
            total: newTotal,
            profit: newProfit,
          });
          alert(`✅ تم إرجاع ${item.name} بنجاح وحذفه من الفاتورة!`);
        } else {
          await deleteDoc(invoiceRef);
          alert(`✅ تم إرجاع ${item.name} وحُذفت الفاتورة لأنها أصبحت فارغة.`);
        }
      } else {
        alert("⚠️ لم يتم العثور على الفاتورة!");
      }
    } catch (error) {
      console.error("خطأ أثناء الإرجاع:", error);
      alert("❌ حدث خطأ أثناء إرجاع المنتج");
    }
  };

  return (
    <div className={styles.mainContainer}>
      <SideBar openSideBar={openSideBar} setOpenSideBar={setOpenSideBar} />

      <div className={styles.middleSection}>
        <div className={styles.title}>
          <div className={styles.rightSide}>
            <button onClick={() => setOpenSideBar(true)}><FaBars /></button>
            <h3>المبيعات اليومية</h3>
          </div>
            <div className={styles.searchBox}>
            <IoMdSearch />
            <input
              type="text"
              placeholder="ابحث باسم العميل..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.salesContainer}>
          {/* ✅ كروت احصائية */}
          <div className={styles.cardsContainer}>
            <div className={styles.card}>
              <h4>عدد الفواتير</h4>
              <p>{filteredInvoices.length}</p>
            </div>
            <div className={styles.card}>
              <h4>إجمالي المبيعات</h4>
              <p>{totalSales} جنيه</p>
            </div>
            <div className={styles.card}>
              <h4>أنشط موظف</h4>
              <p>{topEmployee}</p>
            </div>
          </div>
          
          {filteredInvoices.length === 0 ? (
            <p>لا توجد عمليات بعد اليوم</p>
          ) : (
            <div className={styles.tableContainer}>
              <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>رقم الهاتف</th>
                  <th>الموظف</th>
                  <th>الإجمالي</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className={styles.tableRow}
                  >
                    <td>{invoice.clientName || "بدون اسم"}</td>
                    <td>{invoice.phone || "-"}</td>
                    <td>{invoice.employee || "غير محدد"}</td>
                    <td>{invoice.total} جنيه</td>
                    <td>{formatDate(invoice.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {selectedInvoice && (
          <div className={styles.invoiceSidebar}>
            <div className={styles.sidebarHeader}>
              <h4>فاتورة العميل</h4>
              <button onClick={() => setSelectedInvoice(null)}>
                <IoIosCloseCircle size={22} />
              </button>
            </div>

            <div className={styles.sidebarInfo}>
              <p><strong>👤 العميل:</strong> {selectedInvoice.clientName || "بدون اسم"}</p>
              <p><strong>📞 الهاتف:</strong> {selectedInvoice.phone || "-"}</p>
              <p><strong>💼 الموظف:</strong> {selectedInvoice.employee || "غير محدد"}</p>
              <p><strong>🕒 التاريخ:</strong> {formatDate(selectedInvoice.date)}</p>

              {/* ✅ الخصم، ملاحظات الخصم، الربح قبل الإجمالي */}
              {selectedInvoice.profit !== undefined && (
                <p><strong>📈 ربح الفاتورة:</strong> {selectedInvoice.profit} جنيه</p>
              )}
              {selectedInvoice.discount > 0 && (
                <p>
                  <strong>🔖 الخصم:</strong> {selectedInvoice.discount} جنيه
                  {selectedInvoice.discountNotes ? ` (ملاحظة: ${selectedInvoice.discountNotes})` : ""}
                </p>
              )}
              <p><strong>💰 الإجمالي:</strong> {selectedInvoice.total} جنيه</p>
            </div>

            <div className={styles.sidebarProducts}>
              <h5>المنتجات</h5>
              <table>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                    <th>السريال</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.cart.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.sellPrice}</td>
                      <td>{item.quantity}</td>
                      <td>{item.serial || "-"}</td>
                      <td>
                        <button
                          className={styles.returnBtn}
                          onClick={() => handleReturnProduct(item, selectedInvoice.id)}
                        >
                          مرتجع
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        </div>

      </div>

      {/* باقي الكود كما هو بدون حذف */}
      <div className={styles.resetContainer}>
        <div className={styles.reset}>
          <div className={styles.topReset}>
            <div className={styles.resetTitle}>
              <h3>محتوى الفاتورة</h3>
              <button onClick={() => setShowClientPopup(true)}>اضف العميل</button>
            </div>
            <div className={styles.resetActions}>
              <div className={styles.inputBox}>
                <label><IoMdSearch /></label>
                <input
                  type="text"
                  list="codeList"
                  placeholder="ابحث بالكود"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
                <datalist id="codeList">
                  {products.map((p) => (
                    <option key={p.id} value={p.code} />
                  ))}
                </datalist>
              </div>
              <button onClick={() => setShowDiscountPopup(true)}>خصم</button>
              <button onClick={handleDeleteInvoice}>حذف الفاتورة</button>
            </div>
          </div>
          <hr />
          <div className={styles.orderBox}>
            {cart.map((item) => (
              <div className={styles.ordersContainer} key={item.id}>
                <div className={styles.orderInfo}>
                  <div className={styles.content}>
                    <button onClick={() => handleDeleteCartItem(item.id)}><FaRegTrashAlt /></button>
                    <div className={styles.text}>
                      <h4>{item.name}</h4>
                      <p>{item.total} EGP</p>
                    </div>
                  </div>
                  <div className={styles.qtyInput}>
                    <button onClick={() => handleQtyChange(item, -1)}>-</button>
                    <input type="text" value={item.quantity} readOnly />
                    <button onClick={() => handleQtyChange(item, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.totalContainer}>
            <hr />
            <div className={styles.totalBox}>
              <h3>الاجمالي</h3>

              {/* NEW: show profit and discount above total */}
              <div style={{ marginBottom: 8 }}>
                <div><strong>📈 ربح الفاتورة:</strong> {profit} جنيه</div>
                <div><strong>🔖 الخصم:</strong> {appliedDiscount} جنيه {appliedDiscount > 0 ? `(ملاحظة: ${discountNotes || '-'})` : null}</div>
              </div>

              <strong>{finalTotal} EGP</strong>
            </div>
            <div className={styles.resetBtns}>
              <button onClick={handleSaveReport}>حفظ</button>
              <button onClick={handleCloseDay}>
                تقفيل اليوم
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ popup لإضافة العميل */}
      {showClientPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupBox}>
            <h3>إضافة بيانات العميل</h3>
            <label>اسم العميل:</label>
            <input type="text" ref={nameRef} placeholder="اكتب اسم العميل" />
            <label>رقم الهاتف:</label>
            <input type="text" ref={phoneRef} placeholder="اكتب رقم الهاتف" />
            <label>اسم الموظف:</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">اختر الموظف</option>
              {employess.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>

            <div className={styles.popupBtns}>
              <button onClick={handleSaveReport}>حفظ</button>
              <button onClick={() => setShowClientPopup(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: popup لتطبيق الخصم والملاحظات */}
      {showDiscountPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupBox}>
            <h3>تطبيق خصم على الفاتورة</h3>
            <label>قيمة الخصم (جنيه):</label>
            <input
              type="number"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              min={0}
              placeholder="ادخل قيمة الخصم"
            />
            <label>الملاحظات:</label>
            <input
              type="text"
              value={discountNotes}
              onChange={(e) => setDiscountNotes(e.target.value)}
              placeholder="اكتب ملاحظة للخصم (اختياري)"
            />

            <div className={styles.popupBtns}>
              <button onClick={handleApplyDiscount}>تطبيق</button>
              <button onClick={() => setShowDiscountPopup(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Main;
