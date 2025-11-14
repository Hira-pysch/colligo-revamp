// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs,
    query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// ---------------------------------------------------------
//  FIREBASE CONFIG
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDByxtekgi1CRBs0FWpSstrIWMlDbv1CHA",
    authDomain: "responsive-app-df28f.firebaseapp.com",
    projectId: "responsive-app-df28f",
    storageBucket: "responsive-app-df28f.firebasestorage.app",
    messagingSenderId: "242703032257",
    appId: "1:242703032257:web:cf20ab70b92fa3609e5940"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ---------------------------------------------------------
//  GLOBAL STATE
// ---------------------------------------------------------
let currentTeacherId = null;

let settings = {
    startTime: "08:00",
    firstDuration: 60
};


// ---------------------------------------------------------
//  DOM ELEMENTS
// ---------------------------------------------------------
const sidebarMenuItems = document.querySelectorAll(".menu-item");
const pageSections = document.querySelectorAll(".page-section");
const logoutButton = document.getElementById("logout-button");

// Dashboard
const tileStudents = document.getElementById("tile-students");
const tileAttendance = document.getElementById("tile-attendance");
const broadcastText = document.getElementById("broadcast-text");
const broadcastStatus = document.getElementById("broadcast-status");
const sendBroadcast = document.getElementById("send-broadcast");

// Add students
const addStudentForm = document.getElementById("add-student-form");
const stuFullname = document.getElementById("stu-fullname");
const stuIdnumber = document.getElementById("stu-idnumber");
const stuSection = document.getElementById("stu-section");
const addStudentStatus = document.getElementById("add-student-status");
const studentsList = document.getElementById("students-list");

// Scans
const scanInput = document.getElementById("scan-input");
const scanStatus = document.getElementById("scan-status");
const scanList = document.getElementById("scan-list");
const manualScan = document.getElementById("manual-scan");

// Activities
const addActivityForm = document.getElementById("add-activity-form");
const activityTitle = document.getElementById("activity-title");
const activityDesc = document.getElementById("activity-desc");
const activityStatus = document.getElementById("activity-status");
const activitiesList = document.getElementById("activities-list");

// Settings
const settingsForm = document.getElementById("settings-form");
const settingStartTime = document.getElementById("setting-start-time");
const settingFirstDuration = document.getElementById("setting-first-duration");
const settingsStatus = document.getElementById("settings-status");


// ---------------------------------------------------------
//  VERIFY LOGIN
// ---------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    currentTeacherId = user.uid;

    // Load initial teacher data
    await loadSettings();
    await loadDashboard();
    await loadStudents();
    await loadActivities();
    await loadScans();
});


// ---------------------------------------------------------
//  NAVIGATION
// ---------------------------------------------------------
sidebarMenuItems.forEach(item => {
    item.addEventListener("click", () => {
        const target = item.dataset.target;
        showSection(target);
    });
});

function showSection(section) {
    pageSections.forEach(s => s.classList.add("hidden"));
    document.getElementById(`section-${section}`).classList.remove("hidden");

    sidebarMenuItems.forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-target="${section}"]`).classList.add("active");
}


// ---------------------------------------------------------
//  LOGOUT
// ---------------------------------------------------------
logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../login.html";
});


// ---------------------------------------------------------
//  DASHBOARD
// ---------------------------------------------------------
async function loadDashboard() {
    // student count
    const q1 = query(collection(db, "students"),
        where("teacherId", "==", currentTeacherId));
    const snap1 = await getDocs(q1);
    tileStudents.textContent = snap1.size;

    // attendance today
    const today = new Date().toISOString().split("T")[0];
    const q2 = query(collection(db, "attendance"),
        where("teacherId", "==", currentTeacherId),
        where("date", "==", today));
    const snap2 = await getDocs(q2);
    tileAttendance.textContent = snap2.size;
}


// ---------------------------------------------------------
//  ANNOUNCEMENTS
// ---------------------------------------------------------
sendBroadcast.addEventListener("click", async () => {
    const msg = broadcastText.value.trim();
    if (!msg) return;

    await addDoc(collection(db, "announcements"), {
        teacherId: currentTeacherId,
        message: msg,
        createdAt: serverTimestamp()
    });

    broadcastStatus.textContent = "Announcement sent!";
    broadcastText.value = "";
    setTimeout(() => broadcastStatus.textContent = "", 3000);
});


// ---------------------------------------------------------
//  ADD STUDENT
// ---------------------------------------------------------
addStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = stuFullname.value.trim();
    const idNumber = stuIdnumber.value.trim();
    const section = stuSection.value.trim();

    if (!name || !idNumber) return;

    await addDoc(collection(db, "students"), {
        teacherId: currentTeacherId,
        name,
        idNumber,
        section,
        createdAt: serverTimestamp()
    });

    addStudentStatus.textContent = "Student added!";
    stuFullname.value = "";
    stuIdnumber.value = "";
    stuSection.value = "";

    loadStudents();
    loadDashboard();

    setTimeout(() => addStudentStatus.textContent = "", 3000);
});

async function loadStudents() {
    const q = query(collection(db, "students"),
        where("teacherId", "==", currentTeacherId),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    const snap = await getDocs(q);
    studentsList.innerHTML = "";

    snap.forEach(docu => {
        const s = docu.data();
        const li = document.createElement("li");
        li.textContent = `${s.name} — ${s.idNumber} (${s.section})`;
        studentsList.appendChild(li);
    });
}


// ---------------------------------------------------------
//  SCAN & ATTENDANCE
// ---------------------------------------------------------
manualScan.addEventListener("click", () => {
    recordScan(scanInput.value.trim());
});

scanInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        recordScan(scanInput.value.trim());
    }
});

async function recordScan(idNumber) {
    if (!idNumber) return;

    scanStatus.textContent = "Checking...";

    // find student
    const q = query(collection(db, "students"),
        where("teacherId", "==", currentTeacherId),
        where("idNumber", "==", idNumber));
    const snap = await getDocs(q);

    if (snap.empty) {
        scanStatus.textContent = "Student not found.";
        return;
    }

    const studentId = snap.docs[0].id;
    const today = new Date().toISOString().split("T")[0];

    // already scanned?
    const existing = query(collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("date", "==", today));
    const existSnap = await getDocs(existing);

    if (!existSnap.empty) {
        scanStatus.textContent = "Already scanned today.";
        return;
    }

    // determine status
    const now = new Date();
    const [h, m] = settings.startTime.split(":");
    const classStart = new Date();
    classStart.setHours(h, m, 0, 0);

    const late = new Date(classStart.getTime() + 10 * 60 * 1000);
    const cutting = new Date(classStart.getTime() + settings.firstDuration * 60 * 1000);

    let status = "present";
    if (now > cutting) status = "cutting";
    else if (now > late) status = "late";

    await addDoc(collection(db, "attendance"), {
        studentId,
        teacherId: currentTeacherId,
        date: today,
        time: now.toISOString(),
        status,
        createdAt: serverTimestamp()
    });

    scanStatus.textContent = `Recorded: ${status}`;
    scanInput.value = "";

    loadScans();
    loadDashboard();

    setTimeout(() => scanStatus.textContent = "", 2000);
}

async function loadScans() {
    const today = new Date().toISOString().split("T")[0];

    const q = query(collection(db, "attendance"),
        where("teacherId", "==", currentTeacherId),
        where("date", "==", today),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    const snap = await getDocs(q);
    scanList.innerHTML = "";

    snap.forEach(docu => {
        const s = docu.data();
        const li = document.createElement("li");
        li.textContent =
            `${s.studentId} — ${s.status} at ${new Date(s.time).toLocaleTimeString()}`;
        scanList.appendChild(li);
    });
}


// ---------------------------------------------------------
//  ACTIVITIES
// ---------------------------------------------------------
addActivityForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = activityTitle.value.trim();
    if (!title) return;

    await addDoc(collection(db, "activities"), {
        teacherId: currentTeacherId,
        title,
        description: activityDesc.value.trim(),
        createdAt: serverTimestamp()
    });

    activityStatus.textContent = "Activity created!";
    activityTitle.value = "";
    activityDesc.value = "";

    loadActivities();
    setTimeout(() => activityStatus.textContent = "", 3000);
});

async function loadActivities() {
    const q = query(collection(db, "activities"),
        where("teacherId", "==", currentTeacherId),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    const snap = await getDocs(q);
    activitiesList.innerHTML = "";

    snap.forEach(docu => {
        const a = docu.data();
        const li = document.createElement("li");
        li.innerHTML = `<strong>${a.title}</strong><br>${a.description}`;
        activitiesList.appendChild(li);
    });
}


// ---------------------------------------------------------
//  SETTINGS
// ---------------------------------------------------------
async function loadSettings() {
    const ref = doc(db, "settings", currentTeacherId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        settings = snap.data();
    }

    settingStartTime.value = settings.startTime;
    settingFirstDuration.value = settings.firstDuration;
}

settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    settings.startTime = settingStartTime.value;
    settings.firstDuration = parseInt(settingFirstDuration.value);

    await setDoc(doc(db, "settings", currentTeacherId), settings);

    settingsStatus.textContent = "Settings saved!";
    setTimeout(() => settingsStatus.textContent = "", 3000);
});
