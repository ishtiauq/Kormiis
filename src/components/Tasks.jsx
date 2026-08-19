import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Select, SelectItem } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Tasks({ tasks = [], setTasks, employees = [], currentUser, addToast, addLog, addNotification }) {
  const [activeStatusTab, setActiveStatusTab] = useState('To Do')
  const [search, setSearch] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [activeTab, setActiveTab] = useState('details')
  const [updateText, setUpdateText] = useState('')
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  
  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    assigneeIds: [],
    dueDate: '',
    tags: [],
    updates: [],
    createdBy: currentUser?.id
  })

  const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done']

  const getPriorityColor = (prio) => {
    switch(prio) {
      case 'High': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'Low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (currentUser?.role === 'Teammate' && currentUser) {
      const isAssignee = t.assigneeIds && t.assigneeIds.includes(currentUser.id);
      const isCreator = t.createdBy === currentUser.id;
      if (!isAssignee && !isCreator) return false;
    }
    const assignees = t.assigneeIds || []
    const matchesAssignee = filterAssignee === 'all' || 
                            (filterAssignee === 'unassigned' && assignees.length === 0) || 
                            assignees.includes(filterAssignee);
    const searchLower = search.toLowerCase();
    const assignedEmployees = employees.filter(e => assignees.includes(e.id));
    const matchesSearch = t.title.toLowerCase().includes(searchLower) || 
                          t.description.toLowerCase().includes(searchLower) ||
                          assignedEmployees.some(emp => emp.name.toLowerCase().includes(searchLower));
    return matchesAssignee && matchesSearch;
  })

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, status) => {
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
      addLog(`Moved task to ${status}`, `Task ID: ${taskId}`)
    }
  }

  const handleSaveTask = () => {
    if (!taskForm.title.trim()) {
      addToast('Task title is required', 'error')
      return
    }

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskForm } : t))
      addToast('Task updated successfully', 'success')
      addLog('Updated Task', `Title: ${taskForm.title}`)
      
      if (addNotification) {
        taskForm.assigneeIds.forEach(id => {
          if (id !== currentUser?.id && !editingTask.assigneeIds?.includes(id)) {
            addNotification(`You have been assigned to task: "${taskForm.title}"`, 'tasks', { title: 'Task Assigned', category: 'task' })
          }
        })
      }
    } else {
      const newTask = {
        ...taskForm,
        id: `task-${Date.now()}`
      }
      setTasks(prev => [newTask, ...prev])
      addToast('Task created successfully', 'success')
      addLog('Created Task', `Title: ${taskForm.title}`)
      
      if (addNotification && taskForm.assigneeIds?.length > 0) {
        taskForm.assigneeIds.forEach(id => {
          if (id !== currentUser?.id) {
            addNotification(`You have been assigned a new task: "${taskForm.title}"`, 'tasks', { title: 'New Task Assigned', category: 'task' })
          }
        })
      }
    }
    closeModal()
  }

  const handleDeleteTask = (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== id))
      addToast('Task deleted', 'success')
    }
  }

  const openModal = (task = null) => {
    setActiveTab('details')
    setUpdateText('')
    setShowAssigneesDropdown(false)
    if (task) {
      setEditingTask(task)
      setTaskForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeIds: task.assigneeIds || [],
        dueDate: task.dueDate || '',
        tags: task.tags || [],
        updates: task.updates || [],
        createdBy: task.createdBy || currentUser?.id
      })
    } else {
      setEditingTask(null)
      setTaskForm({
        title: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        assigneeIds: [],
        dueDate: '',
        tags: [],
        updates: [],
        createdBy: currentUser?.id
      })
    }
    setShowTaskModal(true)
  }

  const handleAddUpdate = () => {
    if (!updateText.trim()) return
    const newUpdate = {
      id: `upd-${Date.now()}`,
      text: updateText,
      authorId: currentUser?.id,
      timestamp: new Date().toISOString()
    }
    
    if (editingTask) {
      setTasks(prev => prev.map(t => {
        if (t.id === editingTask.id) {
          const updatedTask = { ...t, updates: [...(t.updates || []), newUpdate] }
          if (t.createdBy && t.createdBy !== currentUser?.id) {
             if (addNotification) addNotification(`${currentUser?.name || 'Someone'} added an update to task: "${t.title}"`, 'tasks', { title: 'Task Update', category: 'task' })
          }
          t.assigneeIds?.forEach(assigneeId => {
             if (assigneeId !== currentUser?.id) {
                if (addNotification) addNotification(`${currentUser?.name || 'Someone'} updated task: "${t.title}"`, 'tasks', { title: 'Task Update', category: 'task' })
             }
          })
          return updatedTask
        }
        return t
      }))
      setTaskForm(prev => ({ ...prev, updates: [...prev.updates, newUpdate] }))
      addLog('Task Update Added', `Task ID: ${editingTask.id}`)
    }
    setUpdateText('')
  }

  const closeModal = () => {
    setShowTaskModal(false)
    setEditingTask(null)
  }

  const getAssignees = (ids) => {
    if (!ids) return []
    return employees.filter(e => ids.includes(e.id))
  }

  const canEditDetails = currentUser?.role !== 'Teammate' || !editingTask || editingTask.createdBy === currentUser?.id;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col pb-4 border-b border-border border-headline mb-2">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="check_box" className="text-foreground" size={20}/> Tasks
        </h1>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4 items-center w-full justify-between">
        <div className="relative flex-1 min-w-[250px] lg:max-w-md w-full flex items-center">
          <Icon name="search" className="absolute left-3 text-muted-foreground" size={16}/>
          <Input 
            placeholder="Search tasks or assignees..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
            className="pl-9 w-full bg-muted/40"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex-1 sm:flex-none min-w-[140px]">
            <Select value={filterAssignee} onChange={setFilterAssignee}>
              <SelectItem id="all">All Assignees</SelectItem>
              <SelectItem id="unassigned">Unassigned</SelectItem>
              {employees.map(e => <SelectItem key={e.id} id={e.id}>{e.name}</SelectItem>)}
            </Select>
          </div>
          

          <Button onClick={() => openModal()} className="hidden sm:flex shadow-sm">
            <Icon name="add" className="h-4 w-4 mr-2" size={16}/> Add Task
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Task status sections" className="menu-bar">
          {COLUMNS.map(col => {
            const count = filteredTasks.filter(t => t.status === col).length;
            const isActive = activeStatusTab === col;
            return (
              <Button
                key={col}
                role="tab"
                aria-selected={isActive}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 relative justify-center ${!isActive ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => setActiveStatusTab(col)}
              >
                {col}
                <span className={`flex items-center justify-center text-[11px] h-5 min-w-[22px] px-1.5 font-bold rounded-full transition-colors ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                  {count}
                </span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 items-start w-full mt-2">
        {filteredTasks.filter(t => t.status === activeStatusTab).map(task => {
          const assignees = getAssignees(task.assigneeIds)
          return (
            <div 
              key={task.id}
              className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openModal(task) }} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Icon name="edit" className="h-4 w-4" size={16}/>
                  </Button>
                  {(currentUser?.role !== 'Teammate' || task.createdBy === currentUser?.id) && (
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setTaskToDelete(task.id) }} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Icon name="delete" className="h-4 w-4" size={16}/>
                    </Button>
                  )}
                </div>
              </div>
              
              <h4 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2 leading-tight">{task.title}</h4>
              <p className="text-fluid-sm text-muted-foreground break-words mb-3 sm:mb-4 flex-1">{task.description}</p>
              
              <div className="mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Status:</span>
                <Select value={task.status} onChange={(val) => {
                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: val } : t))
                  addLog(`Moved task to ${val}`, `Task ID: ${task.id}`)
                }}>
                  {COLUMNS.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                </Select>
              </div>

              {task.updates && task.updates.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Icon name="chat" className="h-3.5 w-3.5" size={14}/>
                  <span>{task.updates.length} updates</span>
                </div>
              )}
              
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                  {task.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border/50">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Icon name="calendar_month" className="h-3.5 w-3.5" size={14}/>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                </div>
                {assignees.length > 0 && (
                  <div className="flex -space-x-2">
                    {assignees.slice(0, 3).map((a, i) => (
                      <Avatar key={a.id} className="h-7 w-7 border-2 border-card relative" style={{ zIndex: 3 - i }} title={a.name}>
                        {a.avatar ? <AvatarImage src={a.avatar} alt={a.name} className="object-cover" /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={14}/></AvatarFallback>
                      </Avatar>
                    ))}
                    {assignees.length > 3 && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-card relative z-0">
                        +{assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filteredTasks.filter(t => t.status === activeStatusTab).length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
            <Icon name="check_box" className="h-12 w-12 text-muted-foreground/30 mb-3" size={48}/>
            <h3 className="text-lg font-medium text-foreground">No tasks found</h3>
            <p className="text-fluid-sm text-muted-foreground">There are no tasks in '{activeStatusTab}' status.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              handleDeleteTask(taskToDelete);
              setTaskToDelete(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Modal */}
      <Dialog open={showTaskModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-[600px] bg-background border-border p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingTask ? 'Task Details' : 'Add New Task'}</DialogTitle>
          </DialogHeader>
          
          {editingTask ? (
            <div className="w-full flex flex-col">
              <div className="flex bg-muted/50 p-1 rounded-lg w-[calc(100%-3rem)] mx-auto mt-5">
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'details' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'updates' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('updates')}
                >
                  Updates 
                  {taskForm.updates.length > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{taskForm.updates.length}</span>}
                </button>
              </div>
              
              {activeTab === 'details' && (
              <div className="grid gap-5 py-5 max-h-[55vh] overflow-y-auto px-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Task Title <span className="text-destructive">*</span></label>
                  <Input 
                    value={taskForm.title} 
                    onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                    placeholder="e.g. Update user roles"
                    className="bg-background shadow-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Description</label>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-y"
                    value={taskForm.description} 
                    onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                    placeholder="Details about the task..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Tags (comma separated)</label>
                  <Input 
                    value={(taskForm.tags || []).join(', ')} 
                    onChange={e => setTaskForm({...taskForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} 
                    placeholder="e.g. Frontend, Urgent, Bug"
                    className="bg-background shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Status</label>
                    <Select value={taskForm.status} onChange={val => setTaskForm({...taskForm, status: val})}>
                      {COLUMNS.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Priority</label>
                    <Select value={taskForm.priority} onChange={val => setTaskForm({...taskForm, priority: val})}>
                      <SelectItem id="High">High</SelectItem>
                      <SelectItem id="Medium">Medium</SelectItem>
                      <SelectItem id="Low">Low</SelectItem>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Assignees</label>
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        className="w-full justify-between font-normal bg-background shadow-sm h-9 px-3 py-2 text-sm"
                        onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                      >
                        {taskForm.assigneeIds.length > 0 
                          ? <span className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{taskForm.assigneeIds.length}</span> selected</span>
                          : <span className="text-muted-foreground">Select Assignees...</span>}
                        <Icon name="keyboard_arrow_down" className="h-4 w-4 opacity-50" size={16}/>
                      </Button>
                      {showAssigneesDropdown && (
                        <div className="absolute bottom-full mb-1 z-50 w-full bg-popover border border-border rounded-md shadow-md text-popover-foreground">
                          <div className="px-3 py-2 text-sm font-semibold bg-muted/40 border-b border-border">Select Employees</div>
                          <div className="max-h-[180px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                            {employees.map(emp => (
                              <label key={emp.id} className="flex items-center gap-2.5 text-sm p-2 hover:bg-accent rounded-sm cursor-pointer transition-colors group">
                                <input 
                                  type="checkbox" 
                                  checked={taskForm.assigneeIds.includes(emp.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTaskForm({...taskForm, assigneeIds: [...taskForm.assigneeIds, emp.id]})
                                    } else {
                                      setTaskForm({...taskForm, assigneeIds: taskForm.assigneeIds.filter(id => id !== emp.id)})
                                    }
                                  }}
                                  className="rounded border-border accent-primary h-4 w-4 shrink-0 transition-all"
                                />
                                <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border group-hover:ring-primary/50">
                                  {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={12}/></AvatarFallback>
                                </Avatar>
                                <span className="truncate">{emp.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <DatePicker 
                      label="Due Date"
                      value={taskForm.dueDate} 
                      onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} 
                      className="bg-background shadow-sm w-full"
                    />
                  </div>
                </div>
              </div>
              )}
              
              {activeTab === 'updates' && (
              <div className="flex flex-col gap-4 py-4 h-[50vh] px-6">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {taskForm.updates.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground mt-8">No updates yet. Be the first to add one!</div>
                  ) : (
                    taskForm.updates.map(update => {
                      const author = getAssignees([update.authorId])[0]
                      return (
                        <div key={update.id} className="flex gap-3 text-sm">
                          <Avatar className="h-8 w-8 shrink-0">
                            {author?.avatar ? <AvatarImage src={author.avatar} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={16}/></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{author?.name || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">{new Date(update.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-fluid-sm">{update.text}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="flex items-end gap-2 pt-2 border-t border-border mt-auto">
                  <div className="grid gap-1 flex-1">
                    <Input 
                      placeholder="Type your update here..." 
                      value={updateText}
                      onChange={e => setUpdateText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddUpdate()
                      }}
                    />
                  </div>
                  <Button onClick={handleAddUpdate} size="icon"><Icon name="send" className="h-4 w-4" size={16}/></Button>
                </div>
              </div>
              )}
            </div>
          ) : (
            <div className="grid gap-5 py-5 max-h-[65vh] overflow-y-auto px-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Task Title <span className="text-destructive">*</span></label>
                <Input 
                  value={taskForm.title} 
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                  placeholder="e.g. Update user roles"
                  className="bg-background shadow-sm"
                  disabled={!canEditDetails}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Description</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-y"
                  value={taskForm.description} 
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                  placeholder="Details about the task..."
                  disabled={!canEditDetails}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Tags (comma separated)</label>
                <Input 
                  value={(taskForm.tags || []).join(', ')} 
                  onChange={e => setTaskForm({...taskForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} 
                  placeholder="e.g. Frontend, Urgent, Bug"
                  className="bg-background shadow-sm"
                  disabled={!canEditDetails}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Status</label>
                  <Select value={taskForm.status} onChange={val => setTaskForm({...taskForm, status: val})}>
                    {COLUMNS.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Priority</label>
                  <Select value={taskForm.priority} onChange={val => setTaskForm({...taskForm, priority: val})} disabled={!canEditDetails}>
                    <SelectItem id="High">High</SelectItem>
                    <SelectItem id="Medium">Medium</SelectItem>
                    <SelectItem id="Low">Low</SelectItem>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Assignees</label>
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      className="w-full justify-between font-normal bg-background shadow-sm h-9 px-3 py-2 text-sm"
                      onClick={() => { if (canEditDetails) setShowAssigneesDropdown(!showAssigneesDropdown) }}
                      disabled={!canEditDetails}
                    >
                      {taskForm.assigneeIds.length > 0 
                        ? <span className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{taskForm.assigneeIds.length}</span> selected</span>
                        : <span className="text-muted-foreground">Select Assignees...</span>}
                      <Icon name="keyboard_arrow_down" className="h-4 w-4 opacity-50" size={16}/>
                    </Button>
                    {showAssigneesDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md text-popover-foreground">
                        <div className="px-3 py-2 text-sm font-semibold bg-muted/40 border-b border-border">Select Employees</div>
                        <div className="max-h-[180px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                          {employees.map(emp => (
                            <label key={emp.id} className="flex items-center gap-2.5 text-sm p-2 hover:bg-accent rounded-sm cursor-pointer transition-colors group">
                              <input 
                                type="checkbox" 
                                checked={taskForm.assigneeIds.includes(emp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTaskForm({...taskForm, assigneeIds: [...taskForm.assigneeIds, emp.id]})
                                  } else {
                                    setTaskForm({...taskForm, assigneeIds: taskForm.assigneeIds.filter(id => id !== emp.id)})
                                  }
                                }}
                                className="rounded border-border accent-primary h-4 w-4 shrink-0 transition-all"
                              />
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border group-hover:ring-primary/50">
                                  {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={12}/></AvatarFallback>
                                </Avatar>
                                <span>{emp.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <DatePicker 
                    label="Due Date"
                    value={taskForm.dueDate} 
                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} 
                    className="bg-background shadow-sm w-full"
                    isDisabled={!canEditDetails}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            {(!editingTask || activeTab === 'details') && (
              <Button onClick={handleSaveTask}>Save Task</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        className="sm:hidden fixed bottom-[76px] right-8 h-14 w-14 rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] z-50 p-0 hover:scale-105 active:scale-95 transition-transform"
        onClick={() => openModal()}
        aria-label="Add Task"
      >
        <Icon name="add" size={24}/>
      </Button>
    </div>
  )
}
