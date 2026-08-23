/**
 * Kormiis AI Agent Engine
 * Powered by Google Gemini 2.0 Flash / 1.5 Flash API
 * Provides Function Calling, Natural Language Action Execution, and Multimodal File Extraction
 */

export const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Recommended - Fastest & Smartest)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Latest Advanced Reasoning)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Ultra Lightweight)' },
]

export function getAiApiKey() {
  if (typeof window === 'undefined') return 'AQ.Ab8RN6LJ6DmMRiNKbzXca7mj3urwvmno3FNU4pOQI9dQOZXEYQ'
  return (
    localStorage.getItem('kormiis_gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    'AQ.Ab8RN6LJ6DmMRiNKbzXca7mj3urwvmno3FNU4pOQI9dQOZXEYQ'
  )
}

export function setAiApiKey(key) {
  if (typeof window === 'undefined') return
  if (key) {
    localStorage.setItem('kormiis_gemini_api_key', key.trim())
  } else {
    localStorage.removeItem('kormiis_gemini_api_key')
  }
}

export function getAiModel() {
  if (typeof window === 'undefined') return 'gemini-3.6-flash'
  return localStorage.getItem('kormiis_gemini_model') || 'gemini-3.6-flash'
}

export function setAiModel(model) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kormiis_gemini_model', model)
}

// Built-in Function Calling Tool Declarations for Gemini
const TOOL_DECLARATIONS = [
  {
    name: 'create_employee',
    description: 'Add a new employee to the company roster/database.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Full name of the employee' },
        email: { type: 'STRING', description: 'Company or personal email address' },
        phone: { type: 'STRING', description: 'Contact phone number' },
        department: { type: 'STRING', description: 'Department e.g. Engineering, Marketing, HR, Sales, Design, Finance, Operations' },
        position: { type: 'STRING', description: 'Job title e.g. Senior Software Engineer, HR Specialist, Account Executive' },
        salary: { type: 'NUMBER', description: 'Base monthly salary in currency' },
        joinDate: { type: 'STRING', description: 'Date of joining (YYYY-MM-DD)' },
        role: { type: 'STRING', description: 'System role: "Admin", "HR", "Manager", or "Teammate"' }
      },
      required: ['name', 'email', 'department', 'position']
    }
  },
  {
    name: 'update_employee',
    description: 'Update an existing employee details such as salary, department, position, status, or contact info.',
    parameters: {
      type: 'OBJECT',
      properties: {
        employeeNameOrId: { type: 'STRING', description: 'Name or ID of the employee to update' },
        department: { type: 'STRING', description: 'New department' },
        position: { type: 'STRING', description: 'New position / title' },
        salary: { type: 'NUMBER', description: 'New salary amount' },
        status: { type: 'STRING', description: 'Status: "Active", "On Leave", "Probation", or "Terminated"' }
      },
      required: ['employeeNameOrId']
    }
  },
  {
    name: 'update_payroll_entry',
    description: 'Update salary, bonus, deduction, or payment status for an employee in payroll.',
    parameters: {
      type: 'OBJECT',
      properties: {
        employeeNameOrId: { type: 'STRING', description: 'Name or ID of the employee' },
        month: { type: 'STRING', description: 'Month in YYYY-MM format e.g. 2026-08' },
        bonus: { type: 'NUMBER', description: 'Bonus amount to add' },
        deductions: { type: 'NUMBER', description: 'Deduction amount' },
        status: { type: 'STRING', description: 'Payment status: "Paid", "Pending", or "Processing"' }
      },
      required: ['employeeNameOrId']
    }
  },
  {
    name: 'create_announcement',
    description: 'Publish a company-wide announcement or notice.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Headline or title of the announcement' },
        content: { type: 'STRING', description: 'Full body content of the announcement' },
        priority: { type: 'STRING', description: 'Priority: "Normal" or "Important"' }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'create_expense',
    description: 'Record an expense or receipt claim.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', description: 'Expense category e.g. Office Supplies, Travel, Software, Food, Hardware' },
        amount: { type: 'NUMBER', description: 'Expense amount' },
        description: { type: 'STRING', description: 'Brief description of the expense' },
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['category', 'amount', 'description']
    }
  },
  {
    name: 'assign_task',
    description: 'Create and assign a task to team members.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Task title' },
        description: { type: 'STRING', description: 'Task description' },
        assignedToNameOrId: { type: 'STRING', description: 'Name of the employee assigned to' },
        dueDate: { type: 'STRING', description: 'Due date in YYYY-MM-DD format' },
        priority: { type: 'STRING', description: 'Priority: "Low", "Medium", "High", or "Urgent"' }
      },
      required: ['title']
    }
  },
  {
    name: 'navigate_view',
    description: 'Navigate the user to a specific section/view of the app.',
    parameters: {
      type: 'OBJECT',
      properties: {
        view: { type: 'STRING', description: 'Target view: "dashboard", "employees", "payroll", "attendance", "leaves", "expenses", "announcements", "tasks", "documents", "calendar", "assets", "settings", "profile"' }
      },
      required: ['view']
    }
  }
]

/**
 * Zero-Token Local Scope Validator
 * Prevents off-topic requests (e.g. coding, essays, recipes, trivia) from consuming precious API quota.
 */
export function checkLocalScopeGuardrail(prompt, hasAttachment = false) {
  if (hasAttachment) return { isAllowed: true }
  if (!prompt || typeof prompt !== 'string') return { isAllowed: true }

  const text = prompt.toLowerCase().trim()
  if (text.length <= 3) return { isAllowed: true }

  // 1. Common Greetings / Meta Queries - Always Allowed
  const allowedGreetings = [
    'hi', 'hello', 'hey', 'salam', 'assalamu', 'kemon acho', 'ki khobor',
    'help', 'ki korte paro', 'what can you do', 'who are you', 'tmi k',
    'dhonnobad', 'thanks', 'thank you', 'ok', 'bye', 'good morning', 'good evening',
    'হাই', 'হ্যালো', 'কেমন আছো', 'কী করতে পারো', 'ধন্যবাদ'
  ]
  if (allowedGreetings.some(g => text === g || text.startsWith(g + ' ') || text.endsWith(' ' + g))) {
    return { isAllowed: true }
  }

  // 2. Strict Off-Topic Blocklist (Regex matching general AI chit-chat & tasks)
  const offTopicPatterns = [
    /\b(write|create|make|generate|build)\b.*\b(python|javascript|c\+\+|java|html|css|php|rust|golang|sql query for leetcode|algorithm|snake game|tic tac toe|app code|game code)\b/i,
    /\b(solve|do|calculate)\b.*\b(homework|math problem|equation|derivative|integral|physics problem|chemistry|algebra)\b/i,
    /\b(write|compose)\b.*\b(poem|story|novel|essay on|song lyrics|movie script|joke about|riddle|paragraph on)\b/i,
    /\b(who is the president|who won the match|capital of|tell me history of|recipe for|how to cook|who is messi|who is ronaldo|what is the distance|weather in|astrology|horoscope|meaning of life)\b/i,
    /\b(kobita|golpo|ganer lyric|ranna korar|cricket match|football khela|cinemar golpo|kobita likho|golpo bolo)\b/i
  ]

  for (const pattern of offTopicPatterns) {
    if (pattern.test(text)) {
      return {
        isAllowed: false,
        reason: 'আমি শুধুমাত্র Kormiis (কর্মিস) প্ল্যাটফর্মের HR, এমপ্লয়ী, পে-রোল, হাজিরা, ছুটি, খরচ ও অফিসের কাজের নির্দেশনায় সহায়তা করতে পারি। অনুগ্রহ করে অফিসের কাজ সম্পর্কিত কমান্ড দিন।'
      }
    }
  }

  return { isAllowed: true }
}

/**
 * Build System Instruction with context of the current workspace
 */
function buildSystemPrompt(context = {}) {
  const { currentUser, employees = [], settings = {}, payroll = {}, announcements = [], tasks = [], expenses = [] } = context

  const currency = settings.currency || '৳'
  const companyName = settings.company?.name || 'Kormiis'
  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Summary of existing employees for reference
  const employeeSummary = (employees || []).slice(0, 50).map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    department: e.department,
    position: e.position,
    salary: e.salary,
    status: e.status || 'Active'
  }))

  return `You are Kormiis AI — the intelligent, friendly, and autonomous HR & Operations Co-Pilot for ${companyName}.
Current Date: ${todayFormatted} (${today}).
Currency: ${currency}.
Current Logged-in User: ${currentUser?.name || 'Admin'} (${currentUser?.role || 'Admin'}).

Your role is SOLELY and EXCLUSIVELY to assist with workspace and HR management for ${companyName}. You can answer questions, summarize analytics, execute actions (adding employees, updating salaries, posting announcements, filing expenses, creating tasks), and extract data from uploaded files/images.

WORKSPACE CONTEXT:
- Total Employees: ${employees.length}
- Active Employees: ${JSON.stringify(employeeSummary)}
- Total Tasks: ${tasks.length}
- Total Announcements: ${announcements.length}
- Total Expenses: ${expenses.length}

STRICT SCOPE & GUARDRAIL RULES:
1. Under NO circumstances should you answer general trivia, world history, coding/programming tutorials, homework math, recipes, or creative writing.
2. If the user asks anything outside of Kormiis workplace/HR operations, immediately decline politely with: "আমি শুধুমাত্র কর্মিস (Kormiis) প্ল্যাটফর্মের HR, এমপ্লয়ী, পে-রোল, হাজিরা, ছুটি এবং অফিসের কাজের নির্দেশনায় সহায়তা করতে পারি।"
3. When the user asks you to DO a workspace action (e.g. "Add Rahim as designer", "Update Karim's salary to 50k", "Post announcement about holiday", "Add 500 tk lunch expense"):
   - ALWAYS call the appropriate tool/function call.
   - If information is missing (e.g. email or salary), you can make reasonable smart defaults or politely ask for missing details while proposing the action.
4. For file/image uploads:
   - Carefully extract all rows, receipt details, or resume information and invoke the matching function calls or output formatted data.
`
}

/**
 * Send Chat Message to Gemini API
 */
export async function sendChatMessage({
  messages = [],
  context = {},
  fileData = null, // { mimeType: 'image/png', base64: '...' }
  apiKey = null
}) {
  const key = apiKey || getAiApiKey()
  if (!key) {
    throw new Error('Gemini API Key is missing. Please set your free API key in Settings or in the AI Co-Pilot setup.')
  }

  const modelId = getAiModel()
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`

  const systemInstruction = {
    role: 'user',
    parts: [{ text: buildSystemPrompt(context) }]
  }

  // Convert conversation history into Gemini format
  const contents = []

  // Add previous messages (up to last 10 messages)
  const recentMessages = messages.slice(-10)
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      const parts = []
      if (msg.fileData) {
        parts.push({
          inlineData: {
            mimeType: msg.fileData.mimeType,
            data: msg.fileData.base64
          }
        })
      }
      if (msg.text) {
        parts.push({ text: msg.text })
      }
      if (parts.length > 0) {
        contents.push({ role: 'user', parts })
      }
    } else if (msg.role === 'model' || msg.role === 'assistant') {
      const parts = []
      if (msg.text) {
        parts.push({ text: msg.text })
      }
      if (msg.functionCall) {
        parts.push({ functionCall: msg.functionCall })
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts })
      }
    }
  }

  // Build the request payload
  const payload = {
    contents,
    systemInstruction,
    tools: [
      {
        functionDeclarations: TOOL_DECLARATIONS
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `API Error: ${res.status} ${res.statusText}`
      throw new Error(errorMessage)
    }

    const data = await res.json()
    const candidate = data.candidates?.[0]
    const content = candidate?.content
    const parts = content?.parts || []

    let responseText = ''
    let functionCalls = []

    for (const part of parts) {
      if (part.text) {
        responseText += part.text
      }
      if (part.functionCall) {
        functionCalls.push(part.functionCall)
      }
    }

    return {
      text: responseText.trim(),
      functionCalls,
      usage: data.usageMetadata
    }
  } catch (err) {
    console.error('Gemini API call failed:', err)
    throw err
  }
}

/**
 * Utility to convert File/Blob into base64 for multimodal Gemini input
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve({
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        base64
      })
    }
    reader.onerror = error => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Quick Test Gemini API Key connectivity
 */
export async function testGeminiApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Please enter an API key.' }
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello, respond with "OK"' }] }]
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, message: err.error?.message || `Failed (${res.status})` }
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return { success: true, message: 'Connected successfully to Google Gemini!', modelResponse: text.trim() }
  } catch (err) {
    return { success: false, message: err.message || 'Network error connecting to Gemini.' }
  }
}
