// ============================================================
// Rasitu App Management Services - School ERP
// Multi-tenant (white-label) database schema - Drizzle ORM (PostgreSQL / Supabase)
// ============================================================
import { pgTable, text, integer, real, boolean, uniqueIndex } from "drizzle-orm/pg-core";

const cuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const id = () => text("id").primaryKey().$defaultFn(cuid);
const createdAt = () => text("created_at").notNull().$defaultFn(() => new Date().toISOString());

// ---------------- TENANT / WHITE-LABEL BRANDING ----------------
export const tenants = pgTable("tenants", {
  id: id(),
  code: text("code").notNull().unique(),
  schoolName: text("school_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#0F172A"),
  secondaryColor: text("secondary_color").notNull().default("#2563EB"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  affiliationNo: text("affiliation_no"),
  establishedYear: integer("established_year"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------------- USERS / AUTH / ROLES ----------------
// Roles cover every department: SUPER_ADMIN, SCHOOL_ADMIN, ACCOUNTANT,
// ACADEMIC_STAFF, ADMIN_CLERICAL, RECEPTION, SECURITY, IT_STAFF, STORE_KEEPER,
// LAB_ASSISTANT, TRANSPORT_STAFF, CANTEEN_STAFF, LIBRARIAN, PARENT, STUDENT
export const users = pgTable("users", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  username: text("username").notNull(),
  email: text("email"),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  lastLoginAt: text("last_login_at"),
  createdAt: createdAt(),
}, (t) => ({
  tenantUsername: uniqueIndex("users_tenant_username_idx").on(t.tenantId, t.username),
}));

// ---------------- STAFF ----------------
// Departments: ACADEMIC, ADMIN_CLERICAL, RECEPTION, SECURITY, IT, STORE, LAB,
// TRANSPORT, CANTEEN, LIBRARY, ACCOUNTS, MANAGEMENT
export const staff = pgTable("staff", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull().unique().references(() => users.id),
  employeeCode: text("employee_code").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  designation: text("designation").notNull(),
  qualification: text("qualification"),
  dateOfJoining: text("date_of_joining").notNull(),
  dob: text("dob"),
  gender: text("gender"),
  contactNumber: text("contact_number"),
  email: text("email"),
  address: text("address"),
  photoUrl: text("photo_url"),
  bloodGroup: text("blood_group"),
  salary: real("salary"),
  maritalStatus: text("marital_status"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  aadharNo: text("aadhar_no"),
  panNo: text("pan_no"),
  educationJson: text("education_json"), // JSON array: [{ degree, institution, year }]
  bankJson: text("bank_json"), // JSON object: { bankName, accountNo, ifsc, branch }
  documentsJson: text("documents_json"), // JSON array: [{ type, name, dataUrl }]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => ({
  tenantEmpCode: uniqueIndex("staff_tenant_empcode_idx").on(t.tenantId, t.employeeCode),
}));

// ---------------- ACADEMIC STRUCTURE ----------------
export const academicYears = pgTable("academic_years", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  label: text("label").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
});

export const classes = pgTable("classes", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
}, (t) => ({
  tenantName: uniqueIndex("classes_tenant_name_idx").on(t.tenantId, t.name),
}));

export const sections = pgTable("sections", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  classId: text("class_id").notNull().references(() => classes.id),
  name: text("name").notNull(),
  classTeacherId: text("class_teacher_id").references(() => staff.id),
}, (t) => ({
  classSection: uniqueIndex("sections_class_name_idx").on(t.classId, t.name),
}));

export const subjects = pgTable("subjects", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  classId: text("class_id").notNull().references(() => classes.id),
  name: text("name").notNull(),
  code: text("code"),
});

// ---------------- STUDENTS ----------------
export const students = pgTable("students", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").unique().references(() => users.id),
  srNo: text("sr_no").notNull(),
  admissionNo: text("admission_no").notNull(),
  rollNo: text("roll_no"),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender").notNull(),
  bloodGroup: text("blood_group"),
  classId: text("class_id").notNull().references(() => classes.id),
  sectionId: text("section_id").notNull().references(() => sections.id),
  admissionDate: text("admission_date").notNull(),
  previousSchool: text("previous_school"),
  photoUrl: text("photo_url"),
  fatherPhotoUrl: text("father_photo_url"),
  motherPhotoUrl: text("mother_photo_url"),
  familyPhotoUrl: text("family_photo_url"),
  documentsJson: text("documents_json"), // JSON array: [{ type, name, dataUrl }]
  religion: text("religion"),
  category: text("category"),
  aadharNo: text("aadhar_no"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => ({
  tenantSrNo: uniqueIndex("students_tenant_srno_idx").on(t.tenantId, t.srNo),
  tenantAdmNo: uniqueIndex("students_tenant_admno_idx").on(t.tenantId, t.admissionNo),
}));

// Family details + parent login link (siblings supported via multiple rows / shared parent user)
export const studentGuardians = pgTable("student_guardians", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id),
  userId: text("user_id").references(() => users.id),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  guardianName: text("guardian_name"),
  relation: text("relation").notNull().default("FATHER"),
  occupation: text("occupation"),
  phone: text("phone").notNull(),
  altPhone: text("alt_phone"),
  email: text("email"),
  address: text("address"),
  annualIncome: real("annual_income"),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(true),
});

// ---------------- FEES / RECEIPTS ----------------
export const feeStructures = pgTable("fee_structures", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  classId: text("class_id").notNull().references(() => classes.id),
  feeHead: text("fee_head").notNull(),
  amount: real("amount").notNull(),
  frequency: text("frequency").notNull(), // ONE_TIME/MONTHLY/QUARTERLY/HALF_YEARLY/ANNUAL
  academicYearLabel: text("academic_year_label").notNull(),
});

export const feeInvoices = pgTable("fee_invoices", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  studentId: text("student_id").notNull().references(() => students.id),
  academicYearLabel: text("academic_year_label").notNull(),
  period: text("period").notNull(),
  feeHead: text("fee_head").notNull(),
  totalAmount: real("total_amount").notNull(),
  paidAmount: real("paid_amount").notNull().default(0),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING/PARTIAL/PAID/OVERDUE/CANCELLED
  createdAt: createdAt(),
});

export const feePayments = pgTable("fee_payments", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  invoiceId: text("invoice_id").notNull().references(() => feeInvoices.id),
  studentId: text("student_id").notNull().references(() => students.id),
  receiptNo: text("receipt_no").notNull(),
  amount: real("amount").notNull(),
  mode: text("mode").notNull(), // CASH/ONLINE/CHEQUE/UPI/CARD/BANK_TRANSFER
  paymentDate: text("payment_date").notNull().$defaultFn(() => new Date().toISOString()),
  collectedById: text("collected_by_id").references(() => staff.id),
  remarks: text("remarks"),
}, (t) => ({
  tenantReceipt: uniqueIndex("payments_tenant_receipt_idx").on(t.tenantId, t.receiptNo),
}));

// ---------------- ATTENDANCE ----------------
export const attendanceStudent = pgTable("attendance_student", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  studentId: text("student_id").notNull().references(() => students.id),
  sectionId: text("section_id").notNull().references(() => sections.id),
  date: text("date").notNull(),
  status: text("status").notNull(), // PRESENT/ABSENT/LATE/HALF_DAY/ON_LEAVE
  markedById: text("marked_by_id"),
  remarks: text("remarks"),
}, (t) => ({
  studentDate: uniqueIndex("att_student_date_idx").on(t.studentId, t.date),
}));

export const attendanceStaff = pgTable("attendance_staff", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  date: text("date").notNull(),
  status: text("status").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  markedById: text("marked_by_id"),
}, (t) => ({
  staffDate: uniqueIndex("att_staff_date_idx").on(t.staffId, t.date),
}));

// ---------------- EXAMS / MARKS ----------------
export const exams = pgTable("exams", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  classId: text("class_id").notNull().references(() => classes.id),
  name: text("name").notNull(),
  academicYearLabel: text("academic_year_label").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const examMarks = pgTable("exam_marks", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  examId: text("exam_id").notNull().references(() => exams.id),
  studentId: text("student_id").notNull().references(() => students.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  marksObtained: real("marks_obtained").notNull(),
  maxMarks: real("max_marks").notNull().default(100),
  grade: text("grade"),
  remarks: text("remarks"),
}, (t) => ({
  examStudentSubject: uniqueIndex("marks_exam_student_subject_idx").on(t.examId, t.studentId, t.subjectId),
}));

// ---------------- HOMEWORK / ONLINE ASSIGNMENTS ----------------
export const homework = pgTable("homework", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  classId: text("class_id").notNull().references(() => classes.id),
  sectionId: text("section_id").notNull().references(() => sections.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  attachmentUrl: text("attachment_url"),
  assignedDate: text("assigned_date").notNull().$defaultFn(() => new Date().toISOString()),
  dueDate: text("due_date").notNull(),
});

export const homeworkSubmissions = pgTable("homework_submissions", {
  id: id(),
  homeworkId: text("homework_id").notNull().references(() => homework.id),
  studentId: text("student_id").notNull().references(() => students.id),
  submittedAt: text("submitted_at"),
  attachmentUrl: text("attachment_url"),
  status: text("status").notNull().default("PENDING"),
  marks: real("marks"),
  feedback: text("feedback"),
}, (t) => ({
  hwStudent: uniqueIndex("hw_submission_idx").on(t.homeworkId, t.studentId),
}));

// ---------------- COMMUNICATION ----------------
export const notices = pgTable("notices", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audience: text("audience").notNull(), // ALL/CLASS/SECTION/STAFF_ALL/STAFF_DEPARTMENT/PARENTS_ALL
  targetClassId: text("target_class_id"),
  targetSectionId: text("target_section_id"),
  targetDepartment: text("target_department"),
  attachmentUrl: text("attachment_url"),
  senderId: text("sender_id").notNull().references(() => users.id),
  createdAt: createdAt(),
});

export const parentMessages = pgTable("parent_messages", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  studentId: text("student_id").references(() => students.id),
  fromUserId: text("from_user_id").notNull().references(() => users.id),
  toUserId: text("to_user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: createdAt(),
  readAt: text("read_at"),
});

// ---------------- ASSETS ----------------
export const assets = pgTable("assets", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  assetCode: text("asset_code").notNull(),
  category: text("category").notNull(), // COMPUTER_SET/UPS/FURNITURE/LAB_EQUIPMENT/SPORTS_EQUIPMENT/ELECTRICAL/VEHICLE/LIBRARY_ITEM/KITCHEN_CANTEEN/OTHER
  name: text("name").notNull(),
  location: text("location"),
  purchaseDate: text("purchase_date"),
  cost: real("cost"),
  vendor: text("vendor"),
  warrantyExpiry: text("warranty_expiry"),
  status: text("status").notNull().default("WORKING"), // WORKING/UNDER_REPAIR/DAMAGED/DISPOSED
  assignedToId: text("assigned_to_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: createdAt(),
}, (t) => ({
  tenantAssetCode: uniqueIndex("assets_tenant_code_idx").on(t.tenantId, t.assetCode),
}));

// A "Computer Set" breaks down into Monitor + CPU + Keyboard + Mouse etc.
export const assetComponents = pgTable("asset_components", {
  id: id(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  componentType: text("component_type").notNull(), // MONITOR/CPU/KEYBOARD/MOUSE/UPS/OTHER
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  status: text("status").notNull().default("WORKING"),
});

// ---------------- TRANSPORT ----------------
export const vehicles = pgTable("vehicles", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  vehicleNo: text("vehicle_no").notNull(),
  type: text("type"),
  capacity: integer("capacity"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
});

export const transportRoutes = pgTable("transport_routes", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  routeName: text("route_name").notNull(),
  vehicleId: text("vehicle_id").references(() => vehicles.id),
  stops: text("stops"),
});

export const studentTransportAssignments = pgTable("student_transport_assignments", {
  id: id(),
  studentId: text("student_id").notNull().unique().references(() => students.id),
  routeId: text("route_id").notNull().references(() => transportRoutes.id),
  pickupStop: text("pickup_stop"),
  monthlyFee: real("monthly_fee"),
});

// ---------------- FRONT OFFICE ----------------
export const visitors = pgTable("visitors", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone"),
  purpose: text("purpose").notNull(), // Admission Enquiry/Meeting/Delivery/Vendor/Interview/Other
  toMeet: text("to_meet"),
  photoUrl: text("photo_url"),
  idProofUrl: text("id_proof_url"),
  checkIn: text("check_in").notNull().$defaultFn(() => new Date().toISOString()),
  checkOut: text("check_out"),
  remarks: text("remarks"),
  createdAt: createdAt(),
});

export const enquiries = pgTable("enquiries", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  type: text("type").notNull().default("ADMISSION"), // GENERAL/ADMISSION
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  classInterested: text("class_interested"),
  subject: text("subject"), // for GENERAL enquiries: what the enquiry is about
  source: text("source"), // Walk-in/Phone Call/Referral/Online/Other
  status: text("status").notNull().default("NEW"), // NEW/FOLLOW_UP/CONVERTED/CLOSED
  followUpDate: text("follow_up_date"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const gatePasses = pgTable("gate_passes", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  personType: text("person_type").notNull(), // STUDENT/STAFF
  personName: text("person_name").notNull(),
  studentId: text("student_id").references(() => students.id),
  staffId: text("staff_id").references(() => staff.id),
  reason: text("reason").notNull(),
  exitTime: text("exit_time").notNull().$defaultFn(() => new Date().toISOString()),
  returnTime: text("return_time"),
  approvedBy: text("approved_by"),
  status: text("status").notNull().default("OUT"), // OUT/RETURNED
  createdAt: createdAt(),
});

// ---------------- ACCOUNTS MANAGEMENT (school-level, separate from student fees) ----------------
export const vendors = pgTable("vendors", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  category: text("category"),
  phone: text("phone"),
  address: text("address"),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  bankName: text("bank_name").notNull(),
  accountNo: text("account_no").notNull(),
  ifsc: text("ifsc"),
  branch: text("branch"),
  openingBalance: real("opening_balance").notNull().default(0),
});

export const accountsTransactions = pgTable("accounts_transactions", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  type: text("type").notNull(), // EXPENSE/INCOME/DEPOSIT/WITHDRAW
  category: text("category"),
  amount: real("amount").notNull(),
  date: text("date").notNull().$defaultFn(() => new Date().toISOString().slice(0, 10)),
  vendorId: text("vendor_id").references(() => vendors.id),
  bankAccountId: text("bank_account_id").references(() => bankAccounts.id),
  remarks: text("remarks"),
  createdAt: createdAt(),
});

// ---------------- LIBRARY ----------------
export const books = pgTable("books", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  copiesTotal: integer("copies_total").notNull().default(1),
  copiesAvailable: integer("copies_available").notNull().default(1),
});

// ---------------- MESSAGING ----------------
export const messageLogs = pgTable("message_logs", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  channel: text("channel").notNull().default("SMS"), // SMS/APP
  recipientType: text("recipient_type").notNull(), // STUDENT/STAFF/ALL_PARENTS/ALL_STAFF
  recipientId: text("recipient_id"),
  recipientName: text("recipient_name"),
  message: text("message").notNull(),
  sentById: text("sent_by_id"),
  createdAt: createdAt(),
});

// ---------------- STORE / LAB INVENTORY ----------------
export const inventoryItems = pgTable("inventory_items", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  itemName: text("item_name").notNull(),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit"),
  reorderLevel: integer("reorder_level").default(0),
});

export const stockTransactions = pgTable("stock_transactions", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  itemId: text("item_id").notNull().references(() => inventoryItems.id),
  type: text("type").notNull(), // ENTRY/SALE
  quantity: integer("quantity").notNull(),
  party: text("party"), // vendor for ENTRY, buyer for SALE
  rate: real("rate"),
  remarks: text("remarks"),
  date: text("date").notNull().$defaultFn(() => new Date().toISOString().slice(0, 10)),
  createdAt: createdAt(),
});

export const bookIssues = pgTable("book_issues", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  bookId: text("book_id").notNull().references(() => books.id),
  personType: text("person_type").notNull(), // STUDENT/STAFF
  studentId: text("student_id").references(() => students.id),
  staffId: text("staff_id").references(() => staff.id),
  personName: text("person_name").notNull(),
  issueDate: text("issue_date").notNull().$defaultFn(() => new Date().toISOString().slice(0, 10)),
  dueDate: text("due_date"),
  returnDate: text("return_date"),
  status: text("status").notNull().default("ISSUED"), // ISSUED/RETURNED
  createdAt: createdAt(),
});

// ---------------- MASTERS (generic settings/lookups) ----------------
// category examples: ACADEMIC_SESSION, STAFF_DESIGNATION, EXAM_NAME, EXAM_GROUP,
// PERIOD, HOMEWORK_TYPE, HOUSE, STREAM, FEE_PARTICULAR, FEE_SLAB, FEE_DISCOUNT
export const masterItems = pgTable("master_items", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  category: text("category").notNull(),
  name: text("name").notNull(),
  value1: text("value1"), // e.g. amount / start time / percentage
  value2: text("value2"), // e.g. end time / type
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------------- PAYROLL ----------------
export const payrollHeads = pgTable("payroll_heads", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  type: text("type").notNull(), // ALLOWANCE/DEDUCTION
  name: text("name").notNull(),
  amount: real("amount").notNull().default(0),
});

export const salaryPayments = pgTable("salary_payments", {
  id: id(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  month: text("month").notNull(), // e.g. "2026-08"
  basic: real("basic").notNull().default(0),
  allowances: real("allowances").notNull().default(0),
  deductions: real("deductions").notNull().default(0),
  netPay: real("net_pay").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING/PAID
  paidOn: text("paid_on"),
  remarks: text("remarks"),
  createdAt: createdAt(),
});
