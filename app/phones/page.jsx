'use client';
import JsBarcode from "jsbarcode";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import { CiSearch } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { MdOutlinePhone } from "react-icons/md";
import { FaSimCard } from "react-icons/fa";
import { GrNotes } from "react-icons/gr";
import { IoColorPaletteOutline } from "react-icons/io5";
import { FaBarcode } from "react-icons/fa";
import { LuBatteryCharging } from "react-icons/lu";
import { MdStorage } from "react-icons/md";
import { CgSmartphoneRam } from "react-icons/cg";
import { BsBoxSeam } from "react-icons/bs";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

function Phones() {
  const router = useRouter()
  const [editId, setEditId] = useState(null); // لو فيه تعديل
  const [active, setActive] = useState(false);
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  // داخل الـ state form
  const [form, setForm] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    battery: '',
    storage: '',
    ram: '',
    color: '',
    serial: '',
    tax: 'معفي',
    taxValue: '',
    includedItems: [],
    condition: 'جديد',
    owner: '',
    ownerNumber: '',
    sim: '', 
    notes: ''
  });

  const includedOptions = ["الكارتونة", "السماعة", "الشاحن"];
  const [products, setProducts] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  useEffect(() => {
    const checkLock = async() => {
      const userName = localStorage.getItem('userName')
      if(!userName) {
        router.push('/')
        return
      }
      const q = query(collection(db, 'users'), where('userName', '==', userName))
      const querySnapshot = await getDocs(q)
      if(!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data()
        if(user.permissions?.phones === true) {
          alert('ليس ليدك الصلاحية للوصول الى هذه الصفحة❌')
          router.push('/')
          return
        }else {
          setAuth(true)
        }
      }else {
        router.push('/')
        return
      }
      setLoading(false)
    }
    checkLock()
  }, [])

  useEffect(() => {
    if (!shop) return;
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("shop", "==", shop), where('type', '==', 'phone'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, [shop]);

  // ✅ تعديل الفلترة لتشمل (اسم المنتج - اسم التاجر - رقم التاجر - البطارية - الرام - الحالة)
const filteredProducts = searchCode
  ? products.filter((p) => {
      const query = searchCode.toLowerCase();
      return (
        p.name?.toLowerCase().includes(query) ||
        p.owner?.toLowerCase().includes(query) ||
        p.ownerNumber?.toLowerCase().includes(query) ||
        p.battery?.toLowerCase().includes(query) ||
        p.ram?.toLowerCase().includes(query) ||
        p.condition?.toLowerCase().includes(query)
      );
    })
  : products;


  const getNextCode = async () => {
    const q = query(collection(db, "products"), where("shop", "==", shop));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1000;
    const codes = snapshot.docs.map(doc => Number(doc.data().code)).filter(code => !isNaN(code));
    const maxCode = Math.max(...codes);
    return maxCode + 1;
  };

  const handleAddOrUpdateProduct = async () => {
    if (!form.name || !form.buyPrice || !form.sellPrice || !form.battery || !form.storage || !form.color || !form.serial || !form.owner || !form.sim) {
      alert("❗️يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editId) {
      // تعديل المنتج
      try {
        await updateDoc(doc(db, "products", editId), {
          name: form.name,
          buyPrice: Number(form.buyPrice),
          sellPrice: Number(form.sellPrice),
          battery: form.battery,
          storage: form.storage,
          ram: form.ram,
          color: form.color,
          serial: form.serial,
          tax: form.tax,
          taxValue: form.tax === 'بضريبة' ? Number(form.taxValue || 0) : 0,
          includedItems: form.includedItems,
          condition: form.condition,
          owner: form.owner,
          ownerNumber: form.ownerNumber,
          sim: form.sim,
          notes: form.notes
        });
        alert("✅ تم تعديل المنتج بنجاح");
        setEditId(null);
        setActive(false);
      } catch (error) {
        console.error("❌ خطأ أثناء التعديل:", error);
        alert("حدث خطأ أثناء التعديل");
      }
    } else {
      // إضافة منتج جديد
      try {
        const newCode = await getNextCode();
        await addDoc(collection(db, "products"), {
          code: newCode,
          name: form.name,
          buyPrice: Number(form.buyPrice),
          sellPrice: Number(form.sellPrice),
          quantity: Number(1),
          battery: form.battery,
          storage: form.storage,
          ram: form.ram,
          color: form.color,
          serial: form.serial,
          tax: form.tax,
          taxValue: form.tax === 'بضريبة' ? Number(form.taxValue || 0) : 0,
          includedItems: form.includedItems,
          condition: form.condition,
          owner: form.owner,
          ownerNumber: form.ownerNumber,
          sim: form.sim,
          notes: form.notes,
          date: Timestamp.now(),
          type: "phone",
          shop: shop,
          userEmail: localStorage.getItem("email"),
        });
        alert("✅ تم إضافة المنتج بنجاح");
        setActive(false);
      } catch (error) {
        console.error("❌ خطأ أثناء الإضافة:", error);
        alert("حدث خطأ أثناء الإضافة");
      }
    }

    // إعادة تعيين الفورم بعد إضافة أو تعديل
    setForm({
      name: '',
      buyPrice: '',
      sellPrice: '',
      battery: '',
      storage: '',
      ram: '',
      color: '',
      serial: '',
      tax: 'معفي',
      taxValue: '',
      includedItems: [],
      condition: 'جديد',
      owner: '',
      ownerNumber: '',
      sim: '',
      notes: ''
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error("❌ خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handlePrintLabel = (product) => {
    const printWindow = window.open('', '', 'width=400,height=300');
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @media print {
              @page { size: auto; margin: 0; }
              body { margin: 0; padding: 0; }
            }
            .label {
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-size: 8pt;
            }
            svg.barcode { width: 40mm; height: 12mm; }
          </style>
        </head>
        <body>
          <div class="label">
            <div>${product.name ?? ''}</div>
            <div>سعر البيع: ${product.sellPrice ?? ''} EGP</div>
            <div>الكود: ${product.code ?? ''}</div>
            <svg id="barcode" class="barcode"></svg>
          </div>
          <script>
            window.onload = function () {
              JsBarcode("#barcode", "${product.code}", {
                format: "CODE128",
                displayValue: false,
                margin: 0
              });
              setTimeout(() => { window.print(); window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleEdit = (product) => {
    setActive(true); // يظهر قسم إضافة/تعديل المنتج
    setEditId(product.id); // لتحديد التعديل
    setForm({
      name: product.name || '',
      buyPrice: product.buyPrice || '',
      sellPrice: product.sellPrice || '',
      battery: product.battery || '',
      storage: product.storage || '',
      ram: product.ram || '',
      color: product.color || '',
      serial: product.serial || '',
      tax: product.tax || 'معفي',
      taxValue: product.taxValue || '',
      includedItems: product.includedItems || [],
      condition: product.condition || 'جديد',
      owner: product.owner || '',
      ownerNumber: product.ownerNumber || '',
      sim: product.sim || '',
      notes: product.notes || ''
    });
  };

  const totalBuy = filteredProducts.reduce((acc, product) => acc + Number(product.buyPrice || 0), 0);
  const totalSell = filteredProducts.reduce((acc, product) => acc + Number(product.sellPrice || 0), 0);

  if (loading) return <p>🔄 جاري التحقق...</p>;
  if (!auth) return null;

  return (
    <div className={styles.phones}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => { setActive(false); setEditId(null); }}>كل الموبايلات</button>
          <button onClick={() => { setActive(true); setEditId(null); }}>اضف موبايل جديد</button>
        </div>

        {!active && (
          <div className={styles.phoneContainer}>
            <div className={styles.searchBox}>
              <div className="inputContainer">
                <label><CiSearch /></label>
                  <input
                    type="text"
                    list="code"
                    placeholder="ابحث بالاسم، التاجر، رقم التاجر، البطارية، الرام أو الحالة"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                  />
                <datalist id="code">
                  {products.map((product) => (<option key={product.id} value={product.name} />))}
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
                    <th>الشراء</th>
                    <th>البيع</th>
                    <th>البطارية</th>
                    <th>المساحة</th>
                    <th>الرام</th>
                    <th>اللون</th>
                    <th>السريال</th>
                    <th>الضريبة</th>
                    <th>قيمة الضريبة</th>
                    <th>الحالة</th>
                    <th>عدد الخطوط</th>
                    <th>التاجر</th>
                    <th>رقم التاجر</th>
                    <th>مشتملات الجهاز</th>
                    <th>الملاحظات</th>
                    <th>التاريخ</th>
                    <th>تفاعل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.code}</td>
                      <td>{product.name}</td>
                      <td>{product.buyPrice} EGP</td>
                      <td>{product.sellPrice} EGP</td>
                      <td>{product.battery}</td>
                      <td>{product.storage}</td>
                      <td>{product.ram}</td>
                      <td>{product.color}</td>
                      <td>{product.serial}</td>
                      <td>{product.tax}</td>
                      <td>{product.taxValue}</td>
                      <td>{product.condition}</td>
                      <td>{product.sim}</td>
                      <td>{product.owner}</td>
                      <td>{product.ownerNumber}</td>
                      <td>{(product.includedItems || []).join(", ")}</td>
                      <td>{product.notes}</td>
                      <td>{product.date?.toDate().toLocaleDateString("ar-EG")}</td>
                      <td className={styles.actionBtns}>
                        <button onClick={() => handleDelete(product.id)}><FaRegTrashAlt /></button>
                        <button onClick={() => handleEdit(product)}><CiEdit/></button>
                        <button onClick={() => handlePrintLabel(product)}> 🖨️ </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active && (
          <div className={styles.addContainer}>
            {/* نفس الحقول اللي كانت موجودة */}
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><MdDriveFileRenameOutline /></label>
                <input type="text" placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label><FaSimCard/></label>
                <input type="number" placeholder="عدد الخطوط" value={form.sim} onChange={(e) => setForm({ ...form, sim: e.target.value })}/>
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><MdDriveFileRenameOutline /></label>
                <input type="text" placeholder="اسم التاجر" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label><MdOutlinePhone/></label>
                <input type="text" placeholder="رقم التاجر" value={form.ownerNumber} onChange={(e) => setForm({ ...form, ownerNumber: e.target.value })}/>
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><GiMoneyStack /></label>
                <input type="number" placeholder="سعر الشراء" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label><GiMoneyStack /></label>
                <input type="number" placeholder="سعر البيع" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}/>
              </div>

            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><FaBarcode/></label>
                <input type="text" placeholder="السريال" value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label>الحالة</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option value="جديد">جديد</option>
                  <option value="مستعمل">مستعمل</option>
                </select>
              </div>
              <div className="inputContainer">
                <label><IoColorPaletteOutline/></label>
                <input type="text" placeholder="اللون" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}/>
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label><LuBatteryCharging/></label>
                <input type="text" placeholder="البطارية" value={form.battery} onChange={(e) => setForm({ ...form, battery: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label><MdStorage/></label>
                <input type="text" placeholder="المساحة" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })}/>
              </div>
              <div className="inputContainer">
                <label><CgSmartphoneRam/></label>
                <input
                  type="text"
                  placeholder="RAM"
                  value={form.ram}
                  onChange={(e) => setForm({ ...form, ram: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label>الضريبة</label>
                <select value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })}>
                  <option value="معفي">معفي</option>
                  <option value="بضريبة">بضريبة</option>
                </select>
              </div>
              {form.tax === 'بضريبة' && (
                <div className="inputContainer">
                  <label>قيمة الضريبة</label>
                  <input type="number" placeholder="قيمة الضريبة" value={form.taxValue} onChange={(e) => setForm({ ...form, taxValue: e.target.value })}/>
                </div>
              )}
              <div className="inputContainer">
                <label><BsBoxSeam/></label>
                <div>
                  {includedOptions.map(item => (
                    <label key={item} style={{ marginRight: '10px' }}>
                      <input
                        type="checkbox"
                        value={item}
                        checked={form.includedItems.includes(item)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          let updated = [...form.includedItems];
                          if (checked) {
                            updated.push(item);
                          } else {
                            updated = updated.filter(i => i !== item);
                          }
                          setForm({ ...form, includedItems: updated });
                        }}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              
            </div>

            <div className="inputContainer">
              <label><GrNotes/></label>
              <input type="text" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/>
            </div>

            <button className={styles.addBtn} onClick={handleAddOrUpdateProduct}>
              {editId ? "تعديل المنتج" : "اضف المنتج"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Phones;
