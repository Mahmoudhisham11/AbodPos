'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { TfiReload } from "react-icons/tfi";
import * as XLSX from "xlsx"; 
import { saveAs } from "file-saver"; 

function Reports() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [reports, setReports] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0); // ✅ اجمالي المبيعات
    const [expensesTotal, setExpensesTotal] = useState(0); // ✅ اجمالي المصروفات
    const [isDeleting, setIsDeleting] = useState(false); 
    const [source, setSource] = useState("dailySales"); 
    const [searchPhone, setSearchPhone] = useState(""); 
    const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

    // ✅ جلب التقارير
    useEffect(() => {
        if (!shop) return;
        let unsubscribe;

        const applyFilters = (allReports) => {
            let filteredByDate = allReports;
            if (fromDate || toDate) {
                filteredByDate = allReports.filter((report) => {
                    if (!report.date) return false;
                    const reportTime = new Date(report.date.seconds * 1000).getTime();

                    let fromTime = fromDate ? new Date(fromDate) : null;
                    let toTime = toDate ? new Date(toDate) : null;

                    if (fromTime) {
                        fromTime.setHours(0, 0, 0, 0);
                        fromTime = fromTime.getTime();
                    }

                    if (toTime) {
                        toTime.setHours(23, 59, 59, 999);
                        toTime = toTime.getTime();
                    }

                    if (fromTime && toTime) return reportTime >= fromTime && reportTime <= toTime;
                    if (fromTime) return reportTime >= fromTime;

                    return true;
                });
            }

            let filteredByPhone = filteredByDate;
            if (searchPhone.trim()) {
                filteredByPhone = filteredByDate.filter((report) =>
                    report.phone?.toString().includes(searchPhone.trim())
                );
            }

            const filteredReports = filteredByPhone.map((report) => {
                if (filterType === "all") return report;
                return {
                    ...report,
                    cart: report.cart?.filter((item) => item.type === filterType)
                };
            }).filter(report => report.cart?.length);

            let total = 0;
            filteredReports.forEach((report) => {
                report.cart?.forEach((item) => {
                    total += item.sellPrice * item.quantity;
                });
            });

            setReports(filteredReports);
            setTotalAmount(total);
        };

        if (fromDate || toDate) {
            setSource("reports");
            const q = query(collection(db, "reports"), where("shop", "==", shop));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                applyFilters(allReports);
            });
        } else {
            setSource("dailySales");
            const q = query(collection(db, "dailySales"), where("shop", "==", shop));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                applyFilters(allReports);
            });
        }

        return () => unsubscribe && unsubscribe();
    }, [fromDate, toDate, filterType, shop, searchPhone]);

    // ✅ جلب المصروفات
    useEffect(() => {
        if (!shop) return;

        const q = query(collection(db, "masrofat"), where("shop", "==", shop));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                total += Number(data.masrof) || 0;
            });
            setExpensesTotal(total);
        });

        return () => unsubscribe();
    }, [shop]);

    // ✅ الناتج = اجمالي المبيعات - المصروفات
    const netTotal = totalAmount - expensesTotal;

    // ✅ تصدير Excel
    const exportToExcel = () => {
        const exportData = [];
        reports.forEach((report) => {
            report.cart?.forEach((item) => {
                exportData.push({
                    "اسم المنتج": item.name,
                    "السعر": item.sellPrice,
                    "السريال": item.serial || "-",
                    "الكمية": item.quantity,
                    "اسم العميل": report.clientName,
                    "رقم الهاتف": report.phone,
                    "التاريخ": report.date
                        ? new Date(report.date.seconds * 1000).toLocaleDateString("ar-EG")
                        : "-",
                });
            });
        });

        if (exportData.length === 0) {
            alert("لا يوجد بيانات للتصدير");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Reports_${new Date().toLocaleDateString("ar-EG")}.xlsx`);
    };

    return (
        <div className={styles.reports}>
            <SideBar />
            <div className={styles.content}>
                <div className={styles.filterBar}>
                    <div className={styles.inputBox}>
                        <div className="inputContainer">
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </div>
                        <div className="inputContainer">
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />    
                        </div>
                    </div>
                    <div className={styles.inputBox}>
                        <div className="inputContainer">
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">الكل</option>
                                <option value="product">المنتجات</option>
                                <option value="phone">الموبايلات</option>
                            </select>
                        </div>
                        <div className="inputContainer">
                            <input 
                                type="text" 
                                placeholder="بحث برقم العميل" 
                                value={searchPhone} 
                                onChange={(e) => setSearchPhone(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                {/* ✅ الاجمالي مع خصم المصروفات */}
                <div className={styles.totalContainer}>
                    <h2>
                        الصافي: {netTotal} EGP
                    </h2>
                    <button onClick={exportToExcel}>Excel</button>
                </div>

                {/* ✅ باقي الجدول */}
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>السعر</th>
                                <th>السريال</th>
                                <th>الكمية</th>
                                <th>اسم العميل</th>
                                <th>رقم الهاتف</th>
                                <th>مرتجع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) =>
                                report.cart?.map((item, index) => (
                                    <tr key={`${report.id}-${index}`}>
                                        <td>{item.name}</td>
                                        <td>{item.sellPrice} EGP</td>
                                        <td>{item.serial || "-"}</td>
                                        <td>{item.quantity}</td>
                                        <td>{report.clientName}</td>
                                        <td>{report.phone}</td>
                                        <td>
                                            <button 
                                                className={styles.delBtn} 
                                                onClick={() => handleDeleteSingleProduct(report.id, item.code)}
                                            >
                                                <TfiReload />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} style={{ textAlign: "right", fontWeight: "bold" }}>
                                    الصافي: {netTotal} EGP
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Reports;
