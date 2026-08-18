import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db, schema } from "./db";
import { hashPassword } from "./utils/auth";

async function upsertTenant(code: string, schoolName: string, extra: Partial<typeof schema.tenants.$inferInsert> = {}) {
  const [existing] = await db.select().from(schema.tenants).where(eq(schema.tenants.code, code));
  if (existing) return existing;
  const [row] = await db.insert(schema.tenants).values({ code, schoolName, ...extra }).returning();
  return row;
}

async function upsertUser(tenantId: string, username: string, role: string, password = "Demo@123") {
  const [existing] = await db.select().from(schema.users).where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.username, username)));
  if (existing) return existing;
  const [row] = await db.insert(schema.users).values({ tenantId, username, passwordHash: hashPassword(password), role, mustChangePassword: false }).returning();
  return row;
}

// Classes from Play Group to 12th, CBSE
const CLASS_LIST = [
  "Play Group", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

const SUBJECTS_BY_STAGE = {
  preschool: ["Rhymes & Stories", "Numbers", "Alphabets", "Drawing & Art"],
  primary: ["Mathematics", "English", "Hindi", "EVS", "Computer"],
  middleSecondary: ["Mathematics", "Science", "English", "Hindi", "Social Science"],
  seniorSecondary: ["Physics", "Chemistry", "Mathematics", "English", "Computer Science"],
};

function subjectsFor(className: string): string[] {
  if (["Play Group", "Nursery", "LKG", "UKG"].includes(className)) return SUBJECTS_BY_STAGE.preschool;
  const num = parseInt(className.replace("Class ", ""), 10);
  if (num <= 5) return SUBJECTS_BY_STAGE.primary;
  if (num <= 10) return SUBJECTS_BY_STAGE.middleSecondary;
  return SUBJECTS_BY_STAGE.seniorSecondary;
}

const FIRST_NAMES = [
  "Aarav", "Ishaan", "Vivaan", "Aditya", "Reyansh", "Kabir", "Arjun", "Sai", "Krishna", "Rohan",
  "Ananya", "Diya", "Myra", "Saanvi", "Aadhya", "Kiara", "Anika", "Riya", "Ira", "Navya",
  "Vihaan", "Yash", "Dev", "Om", "Aryan", "Kavya", "Meera", "Zara", "Tara", "Aisha",
  "Laksh", "Advik",
];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Yadav", "Mehta", "Joshi", "Reddy", "Nair"];

function nameFor(seed: number) {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[seed % LAST_NAMES.length]}`;
}

// Department-wise test staff (same pattern as the main demo school)
const DEPT_ROLE: Record<string, string> = {
  ACADEMIC: "ACADEMIC_STAFF", ADMIN_CLERICAL: "ADMIN_CLERICAL", RECEPTION: "RECEPTION", SECURITY: "SECURITY",
  IT: "IT_STAFF", STORE: "STORE_KEEPER", LAB: "LAB_ASSISTANT", TRANSPORT: "TRANSPORT_STAFF",
  CANTEEN: "CANTEEN_STAFF", LIBRARY: "LIBRARIAN", ACCOUNTS: "ACCOUNTANT",
};
const STAFF_LIST: Array<[string, string, string]> = [
  ["DS-EMP-ACD-01", "ACADEMIC", "Senior Teacher"],
  ["DS-EMP-ADM-01", "ADMIN_CLERICAL", "Office Clerk"],
  ["DS-EMP-REC-01", "RECEPTION", "Front Desk Executive"],
  ["DS-EMP-SEC-01", "SECURITY", "Security Guard"],
  ["DS-EMP-IT-01", "IT", "IT Administrator"],
  ["DS-EMP-STR-01", "STORE", "Store Keeper"],
  ["DS-EMP-LAB-01", "LAB", "Science Lab Assistant"],
  ["DS-EMP-TRN-01", "TRANSPORT", "Transport In-charge"],
  ["DS-EMP-CAN-01", "CANTEEN", "Canteen Supervisor"],
  ["DS-EMP-LIB-01", "LIBRARY", "Librarian"],
  ["DS-EMP-ACC-01", "ACCOUNTS", "Accountant"],
];

async function main() {
  console.log("Seeding 'Demo School' (Play Group - Class 12, CBSE)...");

  const school = await upsertTenant("demo-school", "Demo School", {
    primaryColor: "#1E3A8A",
    secondaryColor: "#F59E0B",
    address: "45 Nehru Road, Lucknow, Uttar Pradesh",
    phone: "+91-9123456780",
    email: "info@demoschool.edu",
    affiliationNo: "CBSE/998877",
    establishedYear: 2005,
  });

  await upsertUser(school.id, "admin", "SCHOOL_ADMIN", "Demo@Admin1");

  // Staff (one login per department)
  const staffIds: Record<string, string> = {};
  for (const [code, dept, designation] of STAFF_LIST) {
    const u = await upsertUser(school.id, code, DEPT_ROLE[dept]);
    let [s] = await db.select().from(schema.staff).where(and(eq(schema.staff.tenantId, school.id), eq(schema.staff.employeeCode, code)));
    if (!s) {
      [s] = await db.insert(schema.staff).values({
        tenantId: school.id, userId: u.id, employeeCode: code, name: `${designation} (${dept})`, department: dept,
        designation, dateOfJoining: "2022-06-01",
      }).returning();
    }
    staffIds[dept] = s.id;
  }

  let classCounter = 0;
  let studentCounter = 0;

  for (const className of CLASS_LIST) {
    classCounter++;
    let [cls] = await db.select().from(schema.classes).where(and(eq(schema.classes.tenantId, school.id), eq(schema.classes.name, className)));
    if (!cls) [cls] = await db.insert(schema.classes).values({ tenantId: school.id, name: className, order: classCounter }).returning();

    let [section] = await db.select().from(schema.sections).where(and(eq(schema.sections.classId, cls.id), eq(schema.sections.name, "A")));
    if (!section) {
      [section] = await db.insert(schema.sections).values({ tenantId: school.id, classId: cls.id, name: "A", classTeacherId: staffIds["ACADEMIC"] }).returning();
    }

    // Subjects appropriate for this stage
    for (const subjName of subjectsFor(className)) {
      const [existing] = await db.select().from(schema.subjects).where(and(eq(schema.subjects.classId, cls.id), eq(schema.subjects.name, subjName)));
      if (!existing) await db.insert(schema.subjects).values({ tenantId: school.id, classId: cls.id, name: subjName });
    }

    // 2 test students per class
    const classSlug = className.replace(/\s+/g, "").toUpperCase();
    for (let i = 1; i <= 2; i++) {
      studentCounter++;
      const admissionNo = `DS-${classSlug}-${i}`;
      const [existingStudent] = await db.select().from(schema.students).where(and(eq(schema.students.tenantId, school.id), eq(schema.students.admissionNo, admissionNo)));
      if (existingStudent) continue;

      const studentName = nameFor(studentCounter);
      const rollNo = String(i);
      const dobYear = 2026 - (4 + classCounter); // rough age progression by class
      const phone = `90000${String(1000 + studentCounter).slice(-4)}`;

      const studentUser = await upsertUser(school.id, admissionNo, "STUDENT", "Demo@123");
      const parentUser = await upsertUser(school.id, `p-${phone}`, "PARENT", "Demo@123");

      const [student] = await db.insert(schema.students).values({
        tenantId: school.id, userId: studentUser.id, srNo: `DS-SR-${String(studentCounter).padStart(4, "0")}`,
        admissionNo, rollNo, name: studentName, dob: `${dobYear}-0${(i % 9) + 1}-1${classCounter % 9}`,
        gender: i === 1 ? "Male" : "Female", classId: cls.id, sectionId: section.id, admissionDate: "2026-04-01",
      }).returning();

      await db.insert(schema.studentGuardians).values({
        studentId: student.id, userId: parentUser.id,
        fatherName: `${LAST_NAMES[studentCounter % LAST_NAMES.length]} Sr.`, motherName: "Homemaker",
        relation: "FATHER", phone,
      });
    }
  }

  console.log(`\nCreated/verified ${CLASS_LIST.length} classes (Play Group - Class 12), ${STAFF_LIST.length} staff, ~${CLASS_LIST.length * 2} students.\n`);

  console.log("================ DEMO SCHOOL LOGIN CREDENTIALS ================");
  console.log("School Code (tenantCode): demo-school");
  console.log("School Admin        -> username: admin           | password: Demo@Admin1");
  console.log("Academic Staff      -> username: DS-EMP-ACD-01    | password: Demo@123");
  console.log("Admin/Clerical      -> username: DS-EMP-ADM-01    | password: Demo@123");
  console.log("Reception           -> username: DS-EMP-REC-01    | password: Demo@123");
  console.log("Security            -> username: DS-EMP-SEC-01    | password: Demo@123");
  console.log("IT Staff            -> username: DS-EMP-IT-01     | password: Demo@123");
  console.log("Store Keeper        -> username: DS-EMP-STR-01    | password: Demo@123");
  console.log("Lab Assistant       -> username: DS-EMP-LAB-01    | password: Demo@123");
  console.log("Transport Staff     -> username: DS-EMP-TRN-01    | password: Demo@123");
  console.log("Canteen Staff       -> username: DS-EMP-CAN-01    | password: Demo@123");
  console.log("Librarian           -> username: DS-EMP-LIB-01    | password: Demo@123");
  console.log("Accountant          -> username: DS-EMP-ACC-01    | password: Demo@123");
  console.log("Sample Student (Class 10, seat 1) -> username: DS-CLASS10-1 | password: Demo@123");
  console.log("Sample Parent (of that student)    -> phone-based username printed per student, password: Demo@123");
  console.log("=================================================================\n");

  // Print the full students table for reference
  const allStudents = await db.select().from(schema.students).where(eq(schema.students.tenantId, school.id));
  console.log("All students (admissionNo -> name, class via classId):");
  for (const s of allStudents) console.log(`  ${s.admissionNo}  |  ${s.name}  |  Roll ${s.rollNo}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
