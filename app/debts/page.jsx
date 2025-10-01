'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { CiSearch, CiPhone } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { GiMoneyStack } from "react-icons/gi";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { db } from "@/app/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

function Debts() {
  const [active, setActive] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    debt: "",
    debtType: "",
    debtDirection: "",
    dateInput: "",
  });
  const [customers, setCustomers] = useState([]);

  const shop =
    typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  useEffect(() => {
    if (!shop) return;
    // ✅ جلب العملاء حسب الـ shop فقط
    const q = query(collection(db, "debts"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    });

    return () => unsubscribe();
  }, [shop]);

  const handleAddProduct = async () => {
    if (
      !form.name ||
      !form.phone ||
      !form.debt ||
      !form.debtType ||
      !form.debtDirection ||
      !form.dateInput
    ) {
      alert("يرجى ملء كل الحقول");
      return;
    }

    await addDoc(collection(db, "debts"), {
      name: form.name,
      phone: form.phone,
      debt: Number(form.debt),
      debtType: form.debtType,
      debtDirection: form.debtDirection,
      dateInput: form.dateInput,
      date: new Date(),
      shop: shop,
    });

    setForm({
      name: "",
      phone: "",
      debt: "",
      debtType: "",
      debtDirection: "",
      dateInput: "",
    });
    setActive(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "debts", id));
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className={styles.debts}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => setActive(false)}>كل العملاء</button>
          <button onClick={() => setActive(true)}>اضف عميل جديد</button>
        </div>

        {/* ✅ عرض العملاء */}
        <div
          className={styles.phoneContainer}
          style={{ display: active ? "none" : "flex" }}
        >
          <div className={styles.searchBox}>
            <div className="inputContainer">
              <label>
                <CiSearch />
              </label>
              <input
                type="text"
                list="code"
                placeholder="ابحث بالاسم"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
              <datalist id="code">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الهاتف</th>
                  <th>الدين</th>
                  <th>نوع الدين</th>
                  <th>الدين لمين</th>
                  <th>تاريخ الدين</th>
                  <th>تاريخ الإضافة</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.debt} EGP</td>
                    <td>{customer.debtType}</td>
                    <td>{customer.debtDirection}</td>
                    <td>{customer.dateInput}</td>
                    <td>
                      {customer.date?.toDate().toLocaleDateString("ar-EG")}
                    </td>
                    <td>
                      <button
                        className={styles.delBtn}
                        onClick={() => handleDelete(customer.id)}
                      >
                        <FaRegTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ إضافة عميل */}
        <div
          className={styles.addContainer}
          style={{ display: active ? "flex" : "none" }}
        >
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>
                <MdDriveFileRenameOutline />
              </label>
              <input
                type="text"
                placeholder="اسم العميل"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>
                <CiPhone />
              </label>
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="inputContainer">
              <label>
                <GiMoneyStack />
              </label>
              <input
                type="number"
                placeholder="الدين"
                value={form.debt}
                onChange={(e) => setForm({ ...form, debt: e.target.value })}
              />
            </div>

            <div className="inputContainer">
              <label>
                <GiMoneyStack />
              </label>
              <select
                value={form.debtType}
                onChange={(e) => setForm({ ...form, debtType: e.target.value })}
              >
                <option value="">اختر نوع الدين</option>
                <option value="موبايل">موبايل</option>
                <option value="اكسسوار">اكسسوار</option>
                <option value="صيانة">صيانة</option>
              </select>
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <input
                type="date"
                value={form.dateInput}
                onChange={(e) => setForm({ ...form, dateInput: e.target.value })}
              />
            </div>

            <div className="inputContainer">
              <label>
                <GiMoneyStack />
              </label>
              <select
                value={form.debtDirection}
                onChange={(e) =>
                  setForm({ ...form, debtDirection: e.target.value })
                }
              >
                <option value="">الدين لمين</option>
                <option value="ليك">ليك</option>
                <option value="عليك">عليك</option>
              </select>
            </div>
          </div>

          <button className={styles.addBtn} onClick={handleAddProduct}>
            اضف العميل
          </button>
        </div>
      </div>
    </div>
  );
}

export default Debts;
