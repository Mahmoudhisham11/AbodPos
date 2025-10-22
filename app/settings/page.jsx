'use client';
import { useState, useEffect } from "react";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { VscPercentage } from "react-icons/vsc";
import { useRouter } from "next/navigation";

export default function Settings() {
  const router = useRouter()
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("usersPermissions");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [permissions, setPermissions] = useState({
    phones: false,
    products: false,
    masrofat: false,
    employees: false,
    debts: false,
    reports: false,
    settings: false,
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [percentage, setPercentage] = useState(""); // ✅ النسبة اللي المستخدم بيكتبها
  const [currentPercentage, setCurrentPercentage] = useState(null); // ✅ النسبة الحالية من Firestore

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
        if(user.permissions.settings === true) {
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

  // ✅ جلب المستخدمين من Firestore
  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const usersData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setUsers(usersData);
  };

  // ✅ تحميل النسبة الحالية من Firestore
  const fetchPercentage = async () => {
    try {
      const docRef = doc(db, "percentage", "mainPercentage");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentPercentage(docSnap.data().value);
      } else {
        setCurrentPercentage(null);
      }
    } catch (error) {
      console.error("Error fetching percentage:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPercentage();
  }, []);

  // ✅ تحميل صلاحيات المستخدم عند اختياره
  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedUser) return;

      try {
        const userRef = doc(db, "users", selectedUser);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();

          // ✅ تحميل الصلاحيات
          setPermissions(userData.permissions || {
            phones: false,
            products: false,
            masrofat: false,
            employees: false,
            debts: false,
            reports: false,
            settings: false,
          });

          // ✅ تحميل حالة التفعيل
          setIsSubscribed(userData.isSubscribed || false);
        }
      } catch (err) {
        console.error("Error loading user permissions: ", err);
      }
    };

    loadPermissions();
  }, [selectedUser]);

  // ✅ تغيير الصلاحية
  const handlePermissionChange = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ✅ حفظ الصلاحيات
  const handleSavePermissions = async () => {
    if (!selectedUser) {
      alert("يرجى اختيار مستخدم أولًا");
      return;
    }

    try {
      const userRef = doc(db, "users", selectedUser);
      await updateDoc(userRef, { permissions });
      alert("تم حفظ الصلاحيات بنجاح ✅");
      await fetchUsers();
    } catch (error) {
      console.error("Error saving permissions: ", error);
      alert("حدث خطأ أثناء الحفظ ❌");
    }
  };

  // ✅ تغيير حالة التفعيل
  const handleActivationChange = async () => {
    if (!selectedUser) {
      alert("يرجى اختيار مستخدم أولًا");
      return;
    }

    const newStatus = !isSubscribed;
    setIsSubscribed(newStatus);

    try {
      const userRef = doc(db, "users", selectedUser);
      await updateDoc(userRef, { isSubscribed: newStatus });
      alert(`تم ${newStatus ? "تفعيل" : "إلغاء تفعيل"} المستخدم بنجاح ✅`);
      await fetchUsers();
    } catch (error) {
      console.error("Error updating subscription: ", error);
      alert("حدث خطأ أثناء تحديث التفعيل ❌");
    }
  };

  // ✅ حفظ أو تحديث النسبة
  const handleSavePercentage = async () => {
    if (!percentage) {
      alert("يرجى إدخال النسبة أولًا");
      return;
    }

    try {
      const docRef = doc(db, "percentage", "mainPercentage");
      await setDoc(docRef, { value: Number(percentage) }); // setDoc هيعمل إنشاء أو تحديث
      alert("تم حفظ النسبة بنجاح ✅");
      setPercentage("");
      fetchPercentage();
    } catch (error) {
      console.error("Error saving percentage:", error);
      alert("حدث خطأ أثناء حفظ النسبة ❌");
    }
  };

  if (loading) return <p>🔄 جاري التحقق...</p>;
  if (!auth) return null;

  return (
    <div className={styles.settings}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.title}>
          <h2>الإعدادات</h2>
        </div>

        {/* ✅ الأزرار */}
        <div className={styles.tabs}>
          <button
            className={activeTab === "usersPermissions" ? styles.active : ""}
            onClick={() => setActiveTab("usersPermissions")}
          >
            صلاحيات المستخدمين
          </button>
          <button
            className={activeTab === "usersActivations" ? styles.active : ""}
            onClick={() => setActiveTab("usersActivations")}
          >
            تفعيلات المستخدمين
          </button>
          <button
            className={activeTab === "percentage" ? styles.active : ""}
            onClick={() => setActiveTab("percentage")}
          >
            النسبة
          </button>
        </div>

        {/* ✅ صلاحيات المستخدمين */}
        {activeTab === "usersPermissions" && (
          <div className={styles.container}>
            <div className={styles.contentContainer}>
              <div className={styles.top}>
                <div className="inputContainer">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">-- اسم المستخدم --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.userName || "مستخدم بدون اسم"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.checkContent}>
                  {[
                    { key: "phones", label: "صفحة الموبايلات" },
                    { key: "products", label: "صفحة المنتجات" },
                    { key: "masrofat", label: "صفحة المصاريف" },
                    { key: "employees", label: "صفحة الموظفين" },
                    { key: "debts", label: "صفحة الديون" },
                    { key: "reports", label: "صفحة التقارير" },
                    { key: "settings", label: "صفحة الإعدادات" },
                  ].map((item) => (
                    <label key={item.key} className={styles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={permissions[item.key] || false}
                        onChange={() => handlePermissionChange(item.key)}
                      />
                      {item.label}
                      <span className={styles.checkmark}></span>
                    </label>
                  ))}
                </div>
              </div>
              <button className={styles.saveBtn} onClick={handleSavePermissions}>
                حفظ
              </button>
            </div>
          </div>
        )}

        {/* ✅ تفعيلات المستخدمين */}
        {activeTab === "usersActivations" && (
          <div className={styles.container}>
            <div className={styles.contentContainer}>
              <div className={styles.top}>
                <div className="inputContainer">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">-- اسم المستخدم --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.userName || "مستخدم بدون اسم"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.checkContent}>
                  <label className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={isSubscribed}
                      onChange={handleActivationChange}
                    />
                    تفعيل المستخدم
                    <span className={styles.checkmark}></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ النسبة */}
        {activeTab === "percentage" && (
          <div className={styles.container}>
            <div className={styles.contentContainer}>
              <div className={styles.top}>
                <div className={styles.cardContainer}>
                  <div className={styles.card}>
                    <h4>النسبة الحالية</h4>
                    <p>{currentPercentage !== null ? `${currentPercentage}%` : "لا توجد نسبة محفوظة"}</p>
                  </div>
                </div>

                <div className="inputContainer">
                  <label><VscPercentage /></label>
                  <input
                    type="number"
                    placeholder="النسبة"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                  />
                </div>
              </div>

              <button className={styles.saveBtn} onClick={handleSavePercentage}>
                حفظ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

