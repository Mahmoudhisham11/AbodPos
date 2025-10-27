'use client';
import styles from "./styles.module.css";
import Image from "next/image";
import logo from "../../public/images/logo.png"
import { useState } from "react";
import { db } from "@/app/firebase";
import { addDoc, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import emailjs from "emailjs-com";
import { CiLock } from "react-icons/ci";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { IoStorefrontOutline } from "react-icons/io5";

function Login() {
    const [creat, setCreat] = useState(false)
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [shop, setShop] = useState('')
    const [showResetPopup, setShowResetPopup] = useState(false)
    const [resetUserName, setResetUserName] = useState('')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [sentOtp, setSentOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showVerifyPopup, setShowVerifyPopup] = useState(false)

    // ✅ إنشاء حساب جديد
    const handleCreatAcc = async () => {
        if (!userName || !password || !shop) {
            alert("⚠️ يجب إدخال جميع الحقول")
            return
        }

        const q = query(collection(db, 'users'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            await addDoc(collection(db, 'users'), {
                userName,
                password,
                shop,
                isSubscribed: false
            })
            alert("✅ تم انشاء الحساب بنجاح")
            setUserName(''); setPassword(''); setShop('')
        } else {
            alert('❌ المستخدم موجود بالفعل')
        }
    }

    // ✅ تسجيل الدخول
    const handleLogin = async () => {
        const q = query(collection(db, 'users'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) return alert('❌ اسم المستخدم غير صحيح')

        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data()

        if (userData.password !== password) return alert("❌ كلمة المرور غير صحيحة")
        if (userData.isSubscribed === false) return alert('⚠️ يجب تفعيل البرنامج أولاً')

        if (typeof window !== 'undefined') {
            localStorage.setItem('userName', userData.userName)
            localStorage.setItem('shop', userData.shop)
            window.location.reload()
        }
    }

    // ✅ إرسال كود OTP
    const sendOtp = async () => {
        if (!email || !resetUserName) {
            alert("⚠️ أدخل اسم المستخدم والبريد الإلكتروني")
            return
        }

        // نولّد كود عشوائي
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        setSentOtp(code)

        const templateParams = {
            to_email: email,
            otp_code: code,
        }

        try {
            await emailjs.send(
                "service_e96lr6s", // 👈 ضع هنا service ID
                "template_8vuymg3", // 👈 ضع هنا template ID
                templateParams,
                "9bww7-IDQJ9coDcwE" // 👈 ضع هنا public key
            )
            alert("✅ تم إرسال كود التحقق إلى بريدك الإلكتروني")
            setShowResetPopup(false)
            setShowVerifyPopup(true)
        } catch (error) {
            console.error(error)
            alert("❌ فشل في إرسال الكود، حاول لاحقاً")
        }
    }

    // ✅ التحقق من الكود وتغيير كلمة المرور
    const verifyOtpAndChangePassword = async () => {
        if (otp !== sentOtp) {
            alert("❌ كود التحقق غير صحيح")
            return
        }

        const q = query(collection(db, 'users'), where('userName', '==', resetUserName))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            alert("❌ لم يتم العثور على اسم المستخدم")
            return
        }

        const userDoc = querySnapshot.docs[0]
        await updateDoc(doc(db, 'users', userDoc.id), { password: newPassword })

        alert("✅ تم تغيير كلمة المرور بنجاح")
        setShowVerifyPopup(false)
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.logoContainer}>
                <h2>سامسونج عبود</h2>
            </div>

            {/* تسجيل الدخول */}
            <div className={styles.loginContent} style={{ display: creat ? 'none' : 'flex' }}>
                <div className={styles.title}>
                    <h3>مرحبا بك برجاء تسجيل الدخول</h3>
                </div>
                <div className={styles.inputs}>
                    <div className="inputContainer">
                        <label><MdDriveFileRenameOutline /></label>
                        <input type="text" value={userName} placeholder="اسم المستخدم" onChange={(e) => setUserName(e.target.value)} />
                    </div>
                    <div className="inputContainer">
                        <label><CiLock /></label>
                        <input type="password" placeholder="كلمة المرور" onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className={styles.forget}>
                        <button className={styles.forgetBtn} onClick={() => setShowResetPopup(true)}>هل نسيت كلمة المرور؟</button>
                    </div>
                    <button className={styles.loginBtn} onClick={handleLogin}>تسجيل الدخول</button>
                    <button className={styles.creatBtn} onClick={() => setCreat(true)}>ليس لديك حساب؟ <span>انشاء حساب جديد</span></button>
                </div>
            </div>

            {/* إنشاء حساب */}
            <div className={styles.loginContent} style={{ display: creat ? 'flex' : 'none' }}>
                <div className={styles.title}>
                    <h3>مرحبا بك برجاء انشاء حساب جديد</h3>
                </div>
                <div className={styles.inputs}>
                    <div className="inputContainer">
                        <label><MdDriveFileRenameOutline /></label>
                        <input type="text" value={userName} placeholder="اسم المستخدم" onChange={(e) => setUserName(e.target.value)} />
                    </div>
                    <div className="inputContainer">
                        <label><CiLock /></label>
                        <input type="password" value={password} placeholder="كلمة المرور" onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="inputContainer">
                        <label><IoStorefrontOutline /></label>
                        <input type="text" value={shop} placeholder="اسم الفرع" onChange={(e) => setShop(e.target.value)} />
                    </div>
                    <button className={styles.loginBtn} onClick={handleCreatAcc}>انشاء حساب جديد</button>
                    <button className={styles.creatBtn} onClick={() => setCreat(false)}>لديك حساب بالفعل؟ <span>تسجيل الدخول</span></button>
                </div>
            </div>

            {/* Popup استرجاع كلمة المرور */}
            {showResetPopup && (
                <div className={styles.popup}>
                    <div className={styles.popupBox}>
                        <h3>استرجاع كلمة المرور</h3>
                        <input type="text" placeholder="اسم المستخدم" value={resetUserName} onChange={(e) => setResetUserName(e.target.value)} />
                        <input type="email" placeholder="بريدك الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <button onClick={sendOtp}>إرسال كود التحقق</button>
                        <button onClick={() => setShowResetPopup(false)}>إلغاء</button>
                    </div>
                </div>
            )}

            {/* Popup التحقق */}
            {showVerifyPopup && (
                <div className={styles.popup}>
                    <div className={styles.popupBox}>
                        <h3>تأكيد الكود وتغيير كلمة المرور</h3>
                        <input type="text" placeholder="أدخل كود التحقق" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <input type="password" placeholder="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <button onClick={verifyOtpAndChangePassword}>تأكيد</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Login;
