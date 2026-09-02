/**
 * Comprehensive Demo Data for Kormiis HR & Workspace Pulse
 * Provides rich, realistic, interconnected mock records across all modules and widgets.
 */

export const DEMO_EMPLOYEES = [
  {
    id: 'emp-101',
    name: 'Sarah Rahman',
    role: 'Lead Software Engineer',
    department: 'Engineering',
    email: 'sarah.rahman@kormiis.io',
    phone: '+880 1711-234567',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    salary: 165000,
    status: 'Active',
    joinDate: '2023-01-15',
    type: 'Full-Time',
    location: 'Gulshan, Dhaka',
    performance: 4.9,
    tasksCount: 6
  },
  {
    id: 'emp-102',
    name: 'Tanvir Hossain',
    role: 'Senior Product Designer',
    department: 'Design',
    email: 'tanvir.hossain@kormiis.io',
    phone: '+880 1819-876543',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    salary: 135000,
    status: 'Active',
    joinDate: '2023-04-10',
    type: 'Full-Time',
    location: 'Banani, Dhaka',
    performance: 4.8,
    tasksCount: 4
  },
  {
    id: 'emp-103',
    name: 'Nusrat Jahan',
    role: 'HR Operations Lead',
    department: 'HR',
    email: 'nusrat.jahan@kormiis.io',
    phone: '+880 1912-345678',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    salary: 110000,
    status: 'Active',
    joinDate: '2022-11-01',
    type: 'Full-Time',
    location: 'Dhanmondi, Dhaka',
    performance: 4.95,
    tasksCount: 5
  },
  {
    id: 'emp-104',
    name: 'Arif Chowdhury',
    role: 'DevOps & Cloud Architect',
    department: 'Engineering',
    email: 'arif.chowdhury@kormiis.io',
    phone: '+880 1610-987654',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    salary: 155000,
    status: 'Active',
    joinDate: '2023-06-20',
    type: 'Full-Time',
    location: 'Uttara, Dhaka',
    performance: 4.7,
    tasksCount: 3
  },
  {
    id: 'emp-105',
    name: 'Farhana Haque',
    role: 'Growth Marketing Manager',
    department: 'Marketing',
    email: 'farhana.haque@kormiis.io',
    phone: '+880 1515-456789',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&q=80',
    salary: 120000,
    status: 'On Leave',
    joinDate: '2023-08-01',
    type: 'Full-Time',
    location: 'Mirpur DOHS, Dhaka',
    performance: 4.6,
    tasksCount: 2
  },
  {
    id: 'emp-106',
    name: 'Mahmud Hasan',
    role: 'Financial Analyst',
    department: 'Finance',
    email: 'mahmud.hasan@kormiis.io',
    phone: '+880 1713-654321',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    salary: 125000,
    status: 'Active',
    joinDate: '2022-08-15',
    type: 'Full-Time',
    location: 'Bashundhara R/A, Dhaka',
    performance: 4.85,
    tasksCount: 4
  },
  {
    id: 'emp-107',
    name: 'Aylin Sultana',
    role: 'Frontend Engineer',
    department: 'Engineering',
    email: 'aylin.sultana@kormiis.io',
    phone: '+880 1818-123456',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    salary: 95000,
    status: 'Active',
    joinDate: '2024-02-01',
    type: 'Full-Time',
    location: 'Mohakhali DOHS, Dhaka',
    performance: 4.75,
    tasksCount: 5
  },
  {
    id: 'emp-108',
    name: 'Kazi Shakil',
    role: 'QA & Automation Engineer',
    department: 'Engineering',
    email: 'kazi.shakil@kormiis.io',
    phone: '+880 1919-789012',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    salary: 90000,
    status: 'Active',
    joinDate: '2024-01-10',
    type: 'Full-Time',
    location: 'Badda, Dhaka',
    performance: 4.65,
    tasksCount: 4
  }
]

const getTodayStr = () => new Date().toISOString().split('T')[0]
const getPastDateStr = (daysAgo) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}
const getFutureDateStr = (daysAhead) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

export const DEMO_ATTENDANCE = {
  dailyLogs: {
    [getTodayStr()]: {
      'emp-101': { status: 'Present', checkIn: '08:55', checkOut: '17:45', hours: 8.8, geoVerified: true },
      'emp-102': { status: 'Present', checkIn: '09:05', checkOut: '18:10', hours: 8.5, geoVerified: true },
      'emp-103': { status: 'Present', checkIn: '08:50', checkOut: '17:30', hours: 8.6, geoVerified: true },
      'emp-104': { status: 'Present', checkIn: '09:15', checkOut: '18:30', hours: 8.2, geoVerified: true, isLate: true },
      'emp-105': { status: 'On Leave', type: 'Annual Leave' },
      'emp-106': { status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.0, geoVerified: true },
      'emp-107': { status: 'Present', checkIn: '08:58', checkOut: '17:50', hours: 8.8, geoVerified: true },
      'emp-108': { status: 'Present', checkIn: '09:10', checkOut: '18:15', hours: 8.0, geoVerified: true }
    },
    [getPastDateStr(1)]: {
      'emp-101': { status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.0 },
      'emp-102': { status: 'Present', checkIn: '09:12', checkOut: '18:20', hours: 8.0 },
      'emp-103': { status: 'Present', checkIn: '08:50', checkOut: '17:40', hours: 8.5 },
      'emp-104': { status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.0 },
      'emp-105': { status: 'On Leave', type: 'Annual Leave' },
      'emp-106': { status: 'Present', checkIn: '08:55', checkOut: '18:05', hours: 8.1 },
      'emp-107': { status: 'Present', checkIn: '09:02', checkOut: '18:00', hours: 8.0 },
      'emp-108': { status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.0 }
    }
  },
  leaves: [
    {
      id: 'leave-201',
      employeeId: 'emp-105',
      employeeName: 'Farhana Haque',
      department: 'Marketing',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&q=80',
      type: 'Annual Leave',
      startDate: getPastDateStr(1),
      endDate: getFutureDateStr(2),
      days: 4,
      reason: 'Family vacation and personal travel',
      status: 'Approved',
      appliedOn: getPastDateStr(5),
      approvedBy: 'HR Admin'
    },
    {
      id: 'leave-202',
      employeeId: 'emp-102',
      employeeName: 'Tanvir Hossain',
      department: 'Design',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      type: 'Casual Leave',
      startDate: getFutureDateStr(5),
      endDate: getFutureDateStr(6),
      days: 2,
      reason: 'Attending personal family ceremony',
      status: 'Pending',
      appliedOn: getPastDateStr(1)
    },
    {
      id: 'leave-203',
      employeeId: 'emp-108',
      employeeName: 'Kazi Shakil',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      type: 'Medical Leave',
      startDate: getPastDateStr(10),
      endDate: getPastDateStr(9),
      days: 2,
      reason: 'Severe seasonal flu & doctor advised rest',
      status: 'Approved',
      appliedOn: getPastDateStr(11),
      approvedBy: 'HR Admin'
    }
  ],
  balances: {
    'emp-101': { annual: 14, casual: 8, sick: 10 },
    'emp-102': { annual: 12, casual: 6, sick: 9 },
    'emp-103': { annual: 15, casual: 10, sick: 10 },
    'emp-104': { annual: 13, casual: 7, sick: 8 },
    'emp-105': { annual: 10, casual: 6, sick: 10 },
    'emp-106': { annual: 14, casual: 9, sick: 10 },
    'emp-107': { annual: 15, casual: 10, sick: 10 },
    'emp-108': { annual: 13, casual: 8, sick: 8 }
  }
}

export const DEMO_PAYROLL = {
  [new Date().toISOString().slice(0, 7)]: {
    month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    status: 'Processed',
    generatedAt: new Date().toISOString(),
    totalGross: 995000,
    totalNet: 945250,
    totalDeductions: 49750,
    records: [
      { employeeId: 'emp-101', name: 'Sarah Rahman', basic: 82500, hra: 41250, medical: 16500, conveyance: 16500, pf: 8250, net: 156750, status: 'Paid' },
      { employeeId: 'emp-102', name: 'Tanvir Hossain', basic: 67500, hra: 33750, medical: 13500, conveyance: 13500, pf: 6750, net: 128250, status: 'Paid' },
      { employeeId: 'emp-103', name: 'Nusrat Jahan', basic: 55000, hra: 27500, medical: 11000, conveyance: 11000, pf: 5500, net: 104500, status: 'Paid' },
      { employeeId: 'emp-104', name: 'Arif Chowdhury', basic: 77500, hra: 38750, medical: 15500, conveyance: 15500, pf: 7750, net: 147250, status: 'Paid' },
      { employeeId: 'emp-105', name: 'Farhana Haque', basic: 60000, hra: 30000, medical: 12000, conveyance: 12000, pf: 6000, net: 114000, status: 'Paid' },
      { employeeId: 'emp-106', name: 'Mahmud Hasan', basic: 62500, hra: 31250, medical: 12500, conveyance: 12500, pf: 6250, net: 118750, status: 'Paid' },
      { employeeId: 'emp-107', name: 'Aylin Sultana', basic: 47500, hra: 23750, medical: 9500, conveyance: 9500, pf: 4750, net: 90250, status: 'Paid' },
      { employeeId: 'emp-108', name: 'Kazi Shakil', basic: 45000, hra: 22500, medical: 9000, conveyance: 9000, pf: 4500, net: 85500, status: 'Paid' }
    ]
  }
}

export const DEMO_EXPENSES = [
  {
    id: 'exp-301',
    title: 'AWS Production Cloud Hosting Bill',
    category: 'Software & Infrastructure',
    amount: 38500,
    currency: '৳',
    date: getPastDateStr(2),
    submittedBy: 'Arif Chowdhury',
    employeeId: 'emp-104',
    status: 'Approved',
    receipt: 'aws-invoice-aug2026.pdf',
    notes: 'Monthly cluster compute and S3 storage tier'
  },
  {
    id: 'exp-302',
    title: 'Client Lunch & Strategy Meeting',
    category: 'Meals & Entertainment',
    amount: 7200,
    currency: '৳',
    date: getPastDateStr(3),
    submittedBy: 'Sarah Rahman',
    employeeId: 'emp-101',
    status: 'Approved',
    receipt: 'restaurant-receipt-0824.jpg',
    notes: 'Sprint kickoff lunch with fintech client stakeholders'
  },
  {
    id: 'exp-303',
    title: 'Figma Organization Annual License',
    category: 'Software & Subscriptions',
    amount: 24000,
    currency: '৳',
    date: getPastDateStr(4),
    submittedBy: 'Tanvir Hossain',
    employeeId: 'emp-102',
    status: 'Pending',
    receipt: 'figma-invoice.pdf',
    notes: 'Design team seats for 2026 product development'
  },
  {
    id: 'exp-304',
    title: 'Ergonomic Office Chairs for Engineering Pod',
    category: 'Office Equipment',
    amount: 45000,
    currency: '৳',
    date: getPastDateStr(6),
    submittedBy: 'Nusrat Jahan',
    employeeId: 'emp-103',
    status: 'Approved',
    receipt: 'furniture-receipt.pdf',
    notes: 'Health & ergonomics upgrade for Gulshan HQ'
  },
  {
    id: 'exp-305',
    title: 'International Tech Summit Flight Tickets',
    category: 'Travel',
    amount: 55000,
    currency: '৳',
    date: getPastDateStr(8),
    submittedBy: 'Sarah Rahman',
    employeeId: 'emp-101',
    status: 'Reimbursed',
    receipt: 'biman-ticket-0912.pdf',
    notes: 'Keynote presentation at Regional DevOps Conference'
  }
]

export const DEMO_TASKS = [
  {
    id: 'task-401',
    title: 'Ship MonoGlass iOS 26+ UI Architecture',
    description: 'Finalize continuous curvature squircle styles, liquid glass translucent tabs, and ProMotion 120Hz smooth scrolling.',
    status: 'Done',
    priority: 'Urgent',
    assignee: 'Sarah Rahman',
    assigneeId: 'emp-101',
    dueDate: getTodayStr(),
    tag: 'Design System',
    progress: 100
  },
  {
    id: 'task-402',
    title: 'Deploy Automated Salary Payslip Generator',
    description: 'Integrate one-click PDF generation and secure employee email dispatch for monthly payroll.',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Mahmud Hasan',
    assigneeId: 'emp-106',
    dueDate: getFutureDateStr(3),
    tag: 'Payroll',
    progress: 75
  },
  {
    id: 'task-403',
    title: 'Conduct Q3 Performance & Appraisal Reviews',
    description: 'Schedule 1-on-1 feedback sessions with engineering leads and product designers.',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Nusrat Jahan',
    assigneeId: 'emp-103',
    dueDate: getFutureDateStr(5),
    tag: 'HR',
    progress: 60
  },
  {
    id: 'task-404',
    title: 'Design Dark Mode Micro-Interactions & Icons',
    description: 'Refine SVG stroke gradients, active spring overshoot physics, and high-contrast badges.',
    status: 'In Progress',
    priority: 'Medium',
    assignee: 'Tanvir Hossain',
    assigneeId: 'emp-102',
    dueDate: getFutureDateStr(4),
    tag: 'Design',
    progress: 80
  },
  {
    id: 'task-405',
    title: 'Automate Cloud Backup & Security Audit',
    description: 'Setup automated encrypted snapshots and least-privilege Firestore rules audit.',
    status: 'To Do',
    priority: 'Medium',
    assignee: 'Arif Chowdhury',
    assigneeId: 'emp-104',
    dueDate: getFutureDateStr(7),
    tag: 'DevOps',
    progress: 20
  },
  {
    id: 'task-406',
    title: 'End-to-End Test Suite for Mobile Bottom Bar',
    description: 'Verify cross-browser swipe gestures, touch momentum scrolling, and accordion transitions.',
    status: 'To Do',
    priority: 'Low',
    assignee: 'Kazi Shakil',
    assigneeId: 'emp-108',
    dueDate: getFutureDateStr(8),
    tag: 'QA',
    progress: 10
  }
]

export const DEMO_ANNOUNCEMENTS = [
  {
    id: 'ann-501',
    title: '🎉 Q3 Product All-Hands & Townhall Meeting',
    content: 'Join us this Thursday at 4:00 PM for our quarterly townhall! We will review our product roadmap, celebrate key milestones, and announce our Employee of the Quarter awards.',
    date: getTodayStr(),
    author: 'Nusrat Jahan (HR Lead)',
    authorId: 'emp-101',
    pinned: true,
    category: 'Company',
    priority: 'Normal',
    audience: 'all',
    attachments: [],
    reactions: { '👍': ['emp-101', 'emp-102'], '❤️': ['emp-103'], '👎': [] },
    comments: [],
    readBy: ['emp-101', 'emp-102', 'emp-103'],
    poll: null
  },
  {
    id: 'ann-502',
    title: '🏥 Comprehensive Health & Dental Insurance 2026',
    content: 'We have upgraded all teammate health coverage to include enhanced OPD, dental, and dependent healthcare benefits. Please review the updated handbook.',
    date: getPastDateStr(3),
    author: 'HR Operations',
    authorId: 'emp-102',
    pinned: true,
    category: 'Benefits',
    priority: 'Important',
    audience: 'all',
    attachments: [],
    reactions: { '👍': ['emp-101'], '❤️': ['emp-102', 'emp-104'], '👎': [] },
    comments: [],
    readBy: ['emp-101', 'emp-102'],
    poll: null
  },
  {
    id: 'ann-503',
    title: '🚀 Flexible Hybrid Work Policy Update',
    content: 'Starting next month, teammates can choose flexible work-from-anywhere days on Wednesdays and Thursdays with asynchronous daily pulse standups.',
    date: getPastDateStr(7),
    author: 'Leadership Team',
    authorId: 'emp-103',
    pinned: false,
    category: 'Policy',
    priority: 'Normal',
    audience: 'all',
    attachments: [],
    reactions: { '👍': ['emp-102', 'emp-103'], '❤️': ['emp-101'], '👎': [] },
    comments: [],
    readBy: ['emp-101', 'emp-102', 'emp-103'],
    poll: null
  }
]

export const DEMO_ASSETS = [
  {
    id: 'ast-601',
    name: 'Apple MacBook Pro 16" (M3 Max, 64GB)',
    category: 'Laptop',
    serial: 'C02G412KMD6R',
    assignedTo: 'Sarah Rahman',
    assignedToId: 'emp-101',
    status: 'Active',
    condition: 'Excellent',
    value: 380000,
    purchasedDate: '2023-02-10'
  },
  {
    id: 'ast-602',
    name: 'Dell UltraSharp 32" 4K USB-C Hub Monitor',
    category: 'Monitor',
    serial: 'CN-0N856D-74261',
    assignedTo: 'Tanvir Hossain',
    assignedToId: 'emp-102',
    status: 'Active',
    condition: 'Excellent',
    value: 85000,
    purchasedDate: '2023-04-15'
  },
  {
    id: 'ast-603',
    name: 'Herman Miller Aeron Ergonomic Chair',
    category: 'Peripherals',
    serial: 'HM-AER-2023-089',
    assignedTo: 'Arif Chowdhury',
    assignedToId: 'emp-104',
    status: 'Active',
    condition: 'Good',
    value: 145000,
    purchasedDate: '2023-06-25'
  },
  {
    id: 'ast-604',
    name: 'Apple iPad Pro 12.9" M2 + Magic Keyboard',
    category: 'Peripherals',
    serial: 'DMPY5241M70Q',
    assignedTo: 'Farhana Haque',
    assignedToId: 'emp-105',
    status: 'Active',
    condition: 'Excellent',
    value: 160000,
    purchasedDate: '2023-08-10'
  },
  {
    id: 'ast-605',
    name: 'Dell Precision Workstation Tower',
    category: 'Laptop',
    serial: 'DP-TWR-8921-X',
    assignedTo: 'Unassigned',
    status: 'Available',
    condition: 'Mint',
    value: 220000,
    purchasedDate: '2024-01-05'
  }
]

export const DEMO_EVENTS = [
  {
    id: 'evt-701',
    title: 'Product Sprint Demo & Review',
    date: getTodayStr(),
    time: '03:30 PM - 04:30 PM',
    location: 'Conference Room Alpha / Google Meet',
    type: 'Meeting',
    attendees: ['Sarah Rahman', 'Tanvir Hossain', 'Arif Chowdhury']
  },
  {
    id: 'evt-702',
    title: 'Quarterly Executive Board Review',
    date: getFutureDateStr(2),
    time: '11:00 AM - 01:00 PM',
    location: 'Executive Boardroom, Floor 14',
    type: 'Executive',
    attendees: ['All Leadership Leads']
  },
  {
    id: 'evt-703',
    title: '🎂 Team Birthday Celebration: Aylin Sultana',
    date: getFutureDateStr(4),
    time: '05:00 PM - 05:45 PM',
    location: 'HQ Cafeteria & Lounge',
    type: 'Social',
    attendees: ['All Teammates']
  },
  {
    id: 'evt-704',
    title: 'Design System & Accessibility Workshop',
    date: getFutureDateStr(6),
    time: '02:00 PM - 03:30 PM',
    location: 'Innovation Lab',
    type: 'Workshop',
    attendees: ['Engineering & Design Teams']
  }
]

export const DEMO_DOCUMENTS = [
  {
    id: 'doc-801',
    title: 'Kormiis Employee Handbook 2026.pdf',
    category: 'HR Policy',
    size: '2.4 MB',
    uploadedBy: 'Nusrat Jahan',
    date: '2026-01-10'
  },
  {
    id: 'doc-802',
    title: 'Standard Operating Procedures & Security Guide.pdf',
    category: 'Engineering',
    size: '4.1 MB',
    uploadedBy: 'Arif Chowdhury',
    date: '2026-02-15'
  },
  {
    id: 'doc-803',
    title: 'Medical Insurance Claim Form & Guidelines.pdf',
    category: 'Benefits',
    size: '1.2 MB',
    uploadedBy: 'HR Operations',
    date: '2026-03-01'
  }
]

export const DEMO_NOTES = [
  {
    id: 'note-901',
    title: 'Q3 Product Strategy Highlights',
    content: 'Key priorities:\n1. MonoGlass design system rollout across all responsive breakpoints.\n2. One-click payroll tax computation.\n3. Mobile app offline sync resilience.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'note-902',
    title: 'Engineering Hiring Rubric 2026',
    content: 'Evaluate candidates on:\n- Core system design & algorithmic depth\n- Frontend micro-interaction craft (60/120fps)\n- Collaborative communication & ownership',
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
]

export const DEMO_NOTIFICATIONS = [
  {
    id: 'notif-1001',
    title: 'New Leave Request Submitted',
    message: 'Tanvir Hossain submitted a Casual Leave request for 2 days (Family event).',
    category: 'leaves',
    actionType: 'leave_request',
    referenceId: 'leave-202',
    timestamp: Date.now() - 25 * 60 * 1000,
    read: false
  },
  {
    id: 'notif-1002',
    title: 'Expense Claim Awaiting Approval',
    message: 'Tanvir Hossain submitted an expense claim of ৳24,000 for Figma Annual Subscription.',
    category: 'expenses',
    actionType: 'expense_claim',
    referenceId: 'exp-303',
    timestamp: Date.now() - 120 * 60 * 1000,
    read: false
  },
  {
    id: 'notif-1003',
    title: 'Task Assigned to You',
    message: 'Sarah Rahman assigned you to "Ship MonoGlass iOS 26+ UI Architecture".',
    category: 'tasks',
    actionType: 'task_assigned',
    referenceId: 'task-401',
    timestamp: Date.now() - 360 * 60 * 1000,
    read: false
  },
  {
    id: 'notif-1004',
    title: 'Payroll Processed Successfully',
    message: 'Monthly payroll for all 8 teammates has been calculated and processed.',
    category: 'payroll',
    view: 'payroll',
    timestamp: Date.now() - 1440 * 60 * 1000,
    read: true
  }
]

export function seedDemoData(force = false) {
  if (typeof window === 'undefined') return

  const keys = {
    'kormiis_employees_plain': DEMO_EMPLOYEES,
    'kormiis_payroll': DEMO_PAYROLL,
    'kormiis_attendance': DEMO_ATTENDANCE,
    'kormiis_expenses': DEMO_EXPENSES,
    'kormiis_tasks': DEMO_TASKS,
    'kormiis_announcements': DEMO_ANNOUNCEMENTS,
    'kormiis_assets': DEMO_ASSETS,
    'kormiis_events': DEMO_EVENTS,
    'kormiis_documents': DEMO_DOCUMENTS,
    'kormiis_notes': DEMO_NOTES,
    'kormiis_notifications': DEMO_NOTIFICATIONS
  }

  for (const [key, val] of Object.entries(keys)) {
    const existing = localStorage.getItem(key)
    if (force || !existing || existing === '[]' || existing === '{}' || existing === 'null') {
      localStorage.setItem(key, JSON.stringify(val))
    }
  }
}

export function clearDemoData() {
  if (typeof window === 'undefined') return
  const keys = [
    'kormiis_employees_v1',
    'kormiis_employees_v1_plain',
    'kormiis_employees_plain',
    'kormiis_payroll',
    'kormiis_attendance',
    'kormiis_expenses',
    'kormiis_tasks',
    'kormiis_announcements',
    'kormiis_assets',
    'kormiis_events',
    'kormiis_documents',
    'kormiis_notes',
    'kormiis_notifications'
  ]
  keys.forEach(k => localStorage.removeItem(k))
}


