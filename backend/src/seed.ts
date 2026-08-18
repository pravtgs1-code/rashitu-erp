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

async function upsertUser(tenantId: string, username: string, role: string, password = "Rasitu@123") {
  const [existing] = await db.select().from(schema.users).where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.username, username)));
  if (existing) return existing;
  const [row] = await db.insert(schema.users).values({ tenantId, username, passwordHash: hashPassword(password), role, mustChangePassword: false }).returning();
  return row;
}

async function main() {
  console.log("Seeding Rasitu App Management Services demo data...");

  // 1) Rasitu platform tenant + Super Admin (manages all school customers)
  const platform = await upsertTenant("rasitu-platform", "Rasitu App Management Services (Platform)");
  await upsertUser(platform.id, "superadmin", "SUPER_ADMIN", "Rasitu@Super1");

  // 2) A demo customer school - white-labeled instance
  const school = await upsertTenant("greenwood-public-school", "Greenwood Public School", {
    primaryColor: "#0F172A",
    secondaryColor: "#16A34A",
    address: "123 MG Road, New Delhi",
    phone: "+91-9876543210",
    email: "info@greenwoodschool.edu",
    affiliationNo: "CBSE/12345",
    establishedYear: 1998,
  });

  const admin = await upsertUser(school.id, "admin", "SCHOOL_ADMIN", "Rasitu@Admin1");

  // 3) Department-wise staff (one per department, each gets department-appropriate login)
  const deptStaff: Array<[string, string, string]> = [
    ["EMP-ACD-01", "ACADEMIC", "Teacher (Class 10 Maths)"],
    ["EMP-ADM-01", "ADMIN_CLERICAL", "Office Clerk"],
    ["EMP-REC-01", "RECEPTION", "Front Desk Executive"],
    ["EMP-SEC-01", "SECURITY", "Security Guard"],
    ["EMP-IT-01", "IT", "IT Administrator"],
    ["EMP-STR-01", "STORE", "Store Keeper"],
    ["EMP-LAB-01", "LAB", "Science Lab Assistant"],
    ["EMP-TRN-01", "TRANSPORT", "Bus Driver Coordinator"],
    ["EMP-CAN-01", "CANTEEN", "Canteen Supervisor"],
    ["EMP-LIB-01", "LIBRARY", "Librarian"],
    ["EMP-ACC-01", "ACCOUNTS", "Accountant"],
  ];
  const DEPT_ROLE: Record<string, string> = {
    ACADEMIC: "ACADEMIC_STAFF", ADMIN_CLERICAL: "ADMIN_CLERICAL", RECEPTION: "RECEPTION", SECURITY: "SECURITY",
    IT: "IT_STAFF", STORE: "STORE_KEEPER", LAB: "LAB_ASSISTANT", TRANSPORT: "TRANSPORT_STAFF",
    CANTEEN: "CANTEEN_STAFF", LIBRARY: "LIBRARIAN", ACCOUNTS: "ACCOUNTANT",
  };
  const staffIds: Record<string, string> = {};
  for (const [code, dept, designation] of deptStaff) {
    const u = await upsertUser(school.id, code, DEPT_ROLE[dept]);
    let [s] = await db.select().from(schema.staff).where(and(eq(schema.staff.tenantId, school.id), eq(schema.staff.employeeCode, code)));
    if (!s) {
      [s] = await db.insert(schema.staff).values({
        tenantId: school.id, userId: u.id, employeeCode: code, name: designation, department: dept,
        designation, dateOfJoining: "2020-06-01",
      }).returning();
    }
    staffIds[dept] = s.id;
  }

  // 4) Class / Section / Subjects
  let [cls] = await db.select().from(schema.classes).where(and(eq(schema.classes.tenantId, school.id), eq(schema.classes.name, "Class 10")));
  if (!cls) [cls] = await db.insert(schema.classes).values({ tenantId: school.id, name: "Class 10", order: 10 }).returning();

  let [section] = await db.select().from(schema.sections).where(and(eq(schema.sections.classId, cls.id), eq(schema.sections.name, "A")));
  if (!section) [section] = await db.insert(schema.sections).values({ tenantId: school.id, classId: cls.id, name: "A", classTeacherId: staffIds["ACADEMIC"] }).returning();

  const subjectNames = ["Mathematics", "Science", "English", "Social Studies", "Hindi"];
  const subjectIds: string[] = [];
  for (const name of subjectNames) {
    let [subj] = await db.select().from(schema.subjects).where(and(eq(schema.subjects.classId, cls.id), eq(schema.subjects.name, name)));
    if (!subj) [subj] = await db.insert(schema.subjects).values({ tenantId: school.id, classId: cls.id, name }).returning();
    subjectIds.push(subj.id);
  }

  // 5) Students + family/guardian details + logins
  const demoStudents = [
    { srNo: "SR-0001", admissionNo: "ADM-2026-001", rollNo: "1", name: "Aarav Sharma", dob: "2011-04-12", gender: "Male", fatherName: "Rajesh Sharma", motherName: "Sunita Sharma", phone: "9000000001" },
    { srNo: "SR-0002", admissionNo: "ADM-2026-002", rollNo: "2", name: "Diya Verma", dob: "2011-07-22", gender: "Female", fatherName: "Anil Verma", motherName: "Pooja Verma", phone: "9000000002" },
  ];
  const studentIds: string[] = [];
  for (const s of demoStudents) {
    let [student] = await db.select().from(schema.students).where(and(eq(schema.students.tenantId, school.id), eq(schema.students.admissionNo, s.admissionNo)));
    if (!student) {
      const studentUser = await upsertUser(school.id, s.admissionNo, "STUDENT");
      const parentUser = await upsertUser(school.id, `p-${s.phone}`, "PARENT");
      [student] = await db.insert(schema.students).values({
        tenantId: school.id, userId: studentUser.id, srNo: s.srNo, admissionNo: s.admissionNo, rollNo: s.rollNo,
        name: s.name, dob: s.dob, gender: s.gender, classId: cls.id, sectionId: section.id, admissionDate: "2026-04-01",
      }).returning();
      await db.insert(schema.studentGuardians).values({
        studentId: student.id, userId: parentUser.id, fatherName: s.fatherName, motherName: s.motherName,
        relation: "FATHER", phone: s.phone,
      });
    }
    studentIds.push(student.id);
  }

  // 6) Fee structure + invoice + a sample payment (receipt)
  let [feeStruct] = await db.select().from(schema.feeStructures).where(and(eq(schema.feeStructures.tenantId, school.id), eq(schema.feeStructures.feeHead, "Tuition Fee")));
  if (!feeStruct) {
    [feeStruct] = await db.insert(schema.feeStructures).values({
      tenantId: school.id, classId: cls.id, feeHead: "Tuition Fee", amount: 5000, frequency: "MONTHLY", academicYearLabel: "2026-2027",
    }).returning();
  }
  const firstStudentId = studentIds[0];
  let [invoice] = await db.select().from(schema.feeInvoices).where(and(eq(schema.feeInvoices.studentId, firstStudentId), eq(schema.feeInvoices.period, "April 2026")));
  if (!invoice) {
    [invoice] = await db.insert(schema.feeInvoices).values({
      tenantId: school.id, studentId: firstStudentId, academicYearLabel: "2026-2027", period: "April 2026",
      feeHead: "Tuition Fee", totalAmount: 5000, dueDate: "2026-04-10",
    }).returning();
  }
  const [existingPayment] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.invoiceId, invoice.id));
  if (!existingPayment) {
    await db.insert(schema.feePayments).values({
      tenantId: school.id, invoiceId: invoice.id, studentId: firstStudentId, receiptNo: "RCPT-DEMO-0001",
      amount: 5000, mode: "CASH", collectedById: staffIds["ACCOUNTS"],
    });
    await db.update(schema.feeInvoices).set({ paidAmount: 5000, status: "PAID" }).where(eq(schema.feeInvoices.id, invoice.id));
  }

  // 7) Attendance sample (today)
  const today = new Date().toISOString().slice(0, 10);
  for (const sid of studentIds) {
    const [exists] = await db.select().from(schema.attendanceStudent).where(and(eq(schema.attendanceStudent.studentId, sid), eq(schema.attendanceStudent.date, today)));
    if (!exists) {
      await db.insert(schema.attendanceStudent).values({ tenantId: school.id, studentId: sid, sectionId: section.id, date: today, status: "PRESENT" });
    }
  }

  // 8) Exam + marks + marksheet-ready data
  let [exam] = await db.select().from(schema.exams).where(and(eq(schema.exams.classId, cls.id), eq(schema.exams.name, "Unit Test 1")));
  if (!exam) {
    [exam] = await db.insert(schema.exams).values({ tenantId: school.id, classId: cls.id, name: "Unit Test 1", academicYearLabel: "2026-2027", startDate: "2026-07-01", endDate: "2026-07-05" }).returning();
  }
  for (const sid of studentIds) {
    for (const subjId of subjectIds) {
      const [exists] = await db.select().from(schema.examMarks).where(and(eq(schema.examMarks.examId, exam.id), eq(schema.examMarks.studentId, sid), eq(schema.examMarks.subjectId, subjId)));
      if (!exists) {
        const marksObtained = 60 + Math.floor(Math.random() * 35);
        await db.insert(schema.examMarks).values({ tenantId: school.id, examId: exam.id, studentId: sid, subjectId: subjId, marksObtained, maxMarks: 100 });
      }
    }
  }

  // 9) Homework
  const [existingHw] = await db.select().from(schema.homework).where(and(eq(schema.homework.sectionId, section.id), eq(schema.homework.title, "Algebra Worksheet")));
  if (!existingHw) {
    const [hw] = await db.insert(schema.homework).values({
      tenantId: school.id, classId: cls.id, sectionId: section.id, subjectId: subjectIds[0], staffId: staffIds["ACADEMIC"],
      title: "Algebra Worksheet", description: "Complete Q1-Q10 from chapter 3", dueDate: "2026-08-25",
    }).returning();
    for (const sid of studentIds) {
      await db.insert(schema.homeworkSubmissions).values({ homeworkId: hw.id, studentId: sid, status: "PENDING" });
    }
  }

  // 10) Notice
  const [existingNotice] = await db.select().from(schema.notices).where(and(eq(schema.notices.tenantId, school.id), eq(schema.notices.title, "Independence Day Celebration")));
  if (!existingNotice) {
    await db.insert(schema.notices).values({
      tenantId: school.id, title: "Independence Day Celebration", message: "School will celebrate Independence Day on 15th Aug. All students to assemble by 8 AM.",
      audience: "ALL", senderId: admin.id,
    });
  }

  // 11) Assets - a computer set with components + UPS
  const [existingAsset] = await db.select().from(schema.assets).where(and(eq(schema.assets.tenantId, school.id), eq(schema.assets.assetCode, "AST-COMP-001")));
  if (!existingAsset) {
    const [asset] = await db.insert(schema.assets).values({
      tenantId: school.id, assetCode: "AST-COMP-001", category: "COMPUTER_SET", name: "Computer Lab PC 1",
      location: "Computer Lab", purchaseDate: "2024-01-15", cost: 45000, status: "WORKING", assignedToId: staffIds["IT"],
    }).returning();
    const comps: Array<[string, string]> = [["MONITOR", "Dell"], ["CPU", "HP"], ["KEYBOARD", "Logitech"], ["MOUSE", "Logitech"]];
    for (const [type, brand] of comps) {
      await db.insert(schema.assetComponents).values({ assetId: asset.id, componentType: type, brand });
    }

    await db.insert(schema.assets).values({
      tenantId: school.id, assetCode: "AST-UPS-001", category: "UPS", name: "APC UPS 1KVA",
      location: "Computer Lab", purchaseDate: "2024-01-15", cost: 8000, status: "WORKING",
    });
  }

  console.log("\n================ DEMO LOGIN CREDENTIALS ================");
  console.log("Platform (Rasitu) Super Admin  -> tenantCode: rasitu-platform | username: superadmin      | password: Rasitu@Super1");
  console.log("School Admin                   -> tenantCode: greenwood-public-school | username: admin   | password: Rasitu@Admin1");
  console.log("Academic Staff (Teacher)        -> tenantCode: greenwood-public-school | username: EMP-ACD-01 | password: Rasitu@123");
  console.log("Admin/Clerical                  -> username: EMP-ADM-01 | password: Rasitu@123");
  console.log("Reception                       -> username: EMP-REC-01 | password: Rasitu@123");
  console.log("Security                        -> username: EMP-SEC-01 | password: Rasitu@123");
  console.log("IT Staff                        -> username: EMP-IT-01  | password: Rasitu@123");
  console.log("Store Keeper                    -> username: EMP-STR-01 | password: Rasitu@123");
  console.log("Lab Assistant                   -> username: EMP-LAB-01 | password: Rasitu@123");
  console.log("Transport Staff                 -> username: EMP-TRN-01 | password: Rasitu@123");
  console.log("Canteen Staff                   -> username: EMP-CAN-01 | password: Rasitu@123");
  console.log("Librarian                       -> username: EMP-LIB-01 | password: Rasitu@123");
  console.log("Accountant                      -> username: EMP-ACC-01 | password: Rasitu@123");
  console.log("Student (Aarav Sharma)           -> username: ADM-2026-001 | password: Rasitu@123");
  console.log("Parent (of Aarav Sharma)         -> username: p-9000000001 | password: Rasitu@123");
  console.log("==========================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
