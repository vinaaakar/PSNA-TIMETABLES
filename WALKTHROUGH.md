# PSNA Timetable System - Complete Walkthrough

## 1. Project Overview
The **PSNA Timetable System** is a React-based web application designed to automate the scheduling of academic timetables for PSNA College of Engineering & Technology. It ingests raw Excel data containing subjects, faculty, and workload details, and uses an intelligent algorithm to generate conflict-free schedules.

---
## 2. System Architecture

### **Core Stack**
- **Frontend:** React (Vite)
- **Language:** JavaScript
- **State Management:** React Context API (`DataContext`)
- **Styling:** Vanilla CSS with a global variable system (`index.css`)
- **Algorithms:** Custom Genetic Algorithm/Heuristic Solver for scheduling.

### **Directory Structure**
- `src/components`: Reusable UI elements (Sidebar, Modal, DataImporter).
- `src/pages`: Main application views (Dashboard, Subjects, Teachers, Timetable).
- `src/context`: Global state logic.
- `src/utils`: Helper functions for the solver.

---

## 3. Key Workflows

### **A. Data Import ( The "Brain" of the App)**
**Location:** `src/pages/ExcelPreview.jsx`
Most of the logic resides here. The user uploads an Excel file, and the system performs the following complex operations:

1.  **Block Detection:** Only looks for rows that resemble data (skipping logos/titles).
2.  **Header Switching:**
    *   Scans for keywords like "THEORY" and "PRACTICALS" to switch context.
    *   Detects Semester headers (e.g., "Semester II", "ME CSE") to group subjects.
3.  **Integrated Subject Handling (Atomic Lookahead Strategy):**
    *   **Detection:** Checks if a subject name contains `(Integrated)`.
    *   **Lookahead:** Pauses processing of the Theory row to scan ahead for the matching Practical row.
    *   **Atomic Creation:** Creates **BOTH** subjects simultaneously:
        *   **Theory Component:** Type `Integrated` (Purple Badge), Clean Name.
        *   **Lab Component:** Type `Lab` (Blue Badge), Clean Name, Code suffixed with `_LAB`.
    *   **Pipeline Bypass:** Executes `continue` to skip downstream duplicate checks, ensuring the pair is never collapsed.
    *   **Skip Future:** Marks the scanned Practical row as `PROCESSED` to avoid re-importing.
4.  **Count Verification:** Explicitly imports Summary/Total rows if present so the user's row count matches the Excel file exactly.

### **B. Subject & Teacher Management**
**Location:** `src/pages/Subjects.jsx`, `src/pages/Teachers.jsx`
- **Dynamic Filtering:** Users can filter identifying logic by Semester (e.g., "Sem II CSE", "Sem IV ME CSE").
- **Classification:** Subjects are Badged by type:
    *   🟢 **Lecture**: Standard theory.
    *   🔵 **Lab**: Practical sessions.
    *   🟣 **Integrated**: Theory component of integrated courses.
- **Manual Overrides:** Users can manually Add/Edit/Delete entries if the Excel import requires tweaks.

### **C. Timetable Generation (The Solver)**
**Location:** `src/pages/Timetable.jsx` & Constraint Logic
1.  **Constraints:**
    *   Teachers cannot be in two places at once.
    *   Labs require consecutive slots (usually 2 or 3 hours).
    *   Integrated subjects must respect both Theory and Lab requirements.
2.  **Execution:** The user clicks "Generate", and the system iterates through potential schedules to minimize conflicts.
3.  **Visualization:** The result is displayed in a grid view (Days vs. Hours).

### **D. Export & Reporting**
**Location:** `src/pages/WordPreview.jsx`
- Generates a "Print-Ready" version of the timetable.
- Formats the schedule into traditional document tables for official distribution.

---

## 4. User Journey (Step-by-Step)

1.  **Upload:** User navigates to **Import Data** and uploads the Master Excel file.
2.  **Validation:** User checks the **Subjects** page to ensure the count is correct (e.g., 56 subjects) and "Integrated" badges appear correctly.
3.  **Generation:** User goes to **Timetable** page and clicks "Generate".
4.  **Refinement:** If conflicts exist, the user tweaks constraints (e.g., locking a specific slot).
5.  **Export:** User exports the final schedule to Word/PDF for the department.
