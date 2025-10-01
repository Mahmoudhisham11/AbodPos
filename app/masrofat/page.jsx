'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { addDoc, collection, deleteDoc, doc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/firebase";
import { GiReceiveMoney } from "react-icons/gi";
import { FaQuestion } from "react-icons/fa";

function Masrofat() {
    const [active, setActive] = useState(false);
    const [masrof, setMasrof] = useState('');
    const [reason, setReason] = useState('');
    const [shop, setShop] = useState('')
    const [masrofatList, setMasrofatList] = useState([]);

    // عرض البيانات تلقائيًا
    useEffect(() => {
        if(typeof window !== 'undefined') {
            const storageShop = localStorage.getItem('shop')
            setShop(storageShop)
            const q = query(collection(db, "masrofat"), where('shop', '==', storageShop))
            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setMasrofatList(data);
            });
    
            return () => unsub(); 
        }
    }, []);

    // اضافة مصروف
    const handleAddMasrof = async () => {
        if (!masrof || !reason) {
            alert("يرجى ملء كل الحقول");
            return;
        }

        try {
            await addDoc(collection(db, "masrofat"), {
                masrof: Number(masrof),
                reason: reason,
                date: new Date().toLocaleDateString("ar-EG"),
                shop,
            });
            setMasrof('');
            setReason('');
            setActive(false);
        } catch (error) {
            console.error("خطأ أثناء الإضافة:", error);
        }
    };

    // حذف مصروف واحد
    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "masrofat", id));
        } catch (error) {
            console.error("خطأ أثناء الحذف:", error);
        }
    };

    // تقفيل المصروفات (حذف الكل)
    const handleCloseDay = async () => {
        try {
            const snapshot = await getDocs(collection(db, "masrofat"));
            const batchDeletes = snapshot.docs.map((docSnap) => deleteDoc(doc(db, "masrofat", docSnap.id)));
            await Promise.all(batchDeletes);
            alert("تم تقفيل المصروفات");
        } catch (error) {
            console.error("خطأ أثناء تقفيل اليوم:", error);
        }
    };

    const total = masrofatList.reduce((acc, item) => acc + Number(item.masrof || 0), 0);

    return (
        <div className={styles.masrofat}>
            <SideBar />
            <div className={styles.content}>
                <div className={styles.btns}>
                    <button onClick={handleCloseDay}>تقفيل المصاريف</button>
                    <button onClick={() => setActive(!active)}>اضف مصاريف جديدة</button>
                </div>

                <div className={styles.total}>
                    <h2>اجمالي المصاريف: {total}</h2>
                </div>

                {/* جدول المصروفات */}
                <div className={styles.masrofatContent} style={{ display: active ? 'none' : 'flex' }}>
                    <div className={styles.tableContainer}>
                        <table>
                            <thead>
                                <tr>
                                    <th>المصروف</th>
                                    <th>السبب</th>
                                    <th>التاريخ</th>
                                    <th>حذف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {masrofatList.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.masrof}</td>
                                        <td>{item.reason}</td>
                                        <td>{item.date}</td>
                                        <td>
                                            <button className={styles.delBtn} onClick={() => handleDelete(item.id)}>
                                                <FaTrashAlt />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* إضافة مصروف جديد */}
                <div className={styles.addMasrofat} style={{ display: active ? 'flex' : 'none' }}>
                    <div className="inputContainer">
                        <label><GiReceiveMoney/></label>
                        <input
                            type="number"
                            value={masrof}
                            onChange={(e) => setMasrof(e.target.value)}
                        />
                    </div>
                    <div className="inputContainer">
                        <label><FaQuestion/></label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <button className={styles.addBtn} onClick={handleAddMasrof}>اضف المصروف</button>
                </div>
            </div>
        </div>
    );
}

export default Masrofat;
