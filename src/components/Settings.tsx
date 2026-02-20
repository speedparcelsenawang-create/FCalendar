import { useState } from "react"
import { User, Bell, Palette, Lock, Globe, Mail, Phone, Save, Shield, Eye, EyeOff, Moon, Sun, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTheme, type ColorTheme } from "@/hooks/use-theme"

type ThemeOption = {
  id: ColorTheme
  label: string
  lightPreview: { bg: string; primary: string; text: string }
  darkPreview: { bg: string; primary: string; text: string }
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "default",
    label: "Default",
    lightPreview: { bg: "#f0f7ff", primary: "#0ea5e9", text: "#0f1f2b" },
    darkPreview:  { bg: "#0d1a22", primary: "#0ea5e9", text: "#e8f4fb" },
  },
  {
    id: "bubblegum",
    label: "Bubble Gum",
    lightPreview: { bg: "#f5d6e4", primary: "#d4487a", text: "#4a2030" },
    darkPreview:  { bg: "#1e2e3a", primary: "#f5d87c", text: "#f0d0e0" },
  },
  {
    id: "candyland",
    label: "Candy Land",
    lightPreview: { bg: "#fde8ef", primary: "#e03050", text: "#2a1535" },
    darkPreview:  { bg: "#1e1635", primary: "#f5d070", text: "#f5e8c0" },
  },
  {
    id: "claude",
    label: "Claude",
    lightPreview: { bg: "#faf6ef", primary: "#d46b32", text: "#2a1a0e" },
    darkPreview:  { bg: "#1f1610", primary: "#e07840", text: "#f0e8d8" },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    lightPreview: { bg: "#eef2f8", primary: "#00c8e0", text: "#0a1020" },
    darkPreview:  { bg: "#0a0c18", primary: "#e8e030", text: "#c0f0f8" },
  },
  {
    id: "northern-lights",
    label: "Northern Lights",
    lightPreview: { bg: "#eef5f5", primary: "#2a9d7f", text: "#102028" },
    darkPreview:  { bg: "#0a1020", primary: "#40d8a8", text: "#c0f0e8" },
  },
  {
    id: "ocean-breeze",
    label: "Ocean Breeze",
    lightPreview: { bg: "#e8f4f8", primary: "#1a6ea0", text: "#0a1820" },
    darkPreview:  { bg: "#0c1620", primary: "#30b8d8", text: "#b8e8f5" },
  },
]

export function Settings() {
  const { mode, setMode, colorTheme, setColorTheme } = useTheme()

  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john.doe@speedparcel.com",
    phone: "+60 12-345 6789",
    role: "Delivery Manager"
  })

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    weeklyReport: true
  })

  const [appearance, setAppearance] = useState({
    language: "en",
    timezone: "Asia/Kuala_Lumpur"
  })

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const handleSaveProfile = () => {
    alert("Profile settings saved!")
  }

  const handleSaveNotifications = () => {
    alert("Notification settings saved!")
  }

  const handleSaveAppearance = () => {
    alert("Appearance settings saved!")
  }

  const handleChangePassword = () => {
    if (security.newPassword !== security.confirmPassword) {
      alert("New passwords do not match!")
      return
    }
    if (security.newPassword.length < 8) {
      alert("Password must be at least 8 characters!")
      return
    }
    alert("Password changed successfully!")
    setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full overflow-y-auto" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      {/* Profile Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-5" />
          <h2 className="text-2xl font-semibold">Profile</h2>
        </div>
        
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="Your role"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="size-4" />
                Email Address
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="size-4" />
                Phone Number
              </label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+60 12-345 6789"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>
              <Save className="size-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Notification Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="size-5" />
          <h2 className="text-2xl font-semibold">Notifications</h2>
        </div>
        
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.email ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.email ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.push ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.push ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Receive important alerts via SMS</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.sms ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.sms ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Report</p>
                <p className="text-sm text-muted-foreground">Receive weekly delivery summary</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, weeklyReport: !notifications.weeklyReport })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.weeklyReport ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.weeklyReport ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications}>
              <Save className="size-4 mr-2" />
              Save Notifications
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Appearance Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="size-5" />
          <h2 className="text-2xl font-semibold">Appearance</h2>
        </div>
        
        <div className="bg-card rounded-lg border p-6 space-y-6">

          {/* Light / Dark toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("light")}
                className={`flex items-center gap-2 flex-1 py-2 px-4 rounded-md border transition-colors ${
                  mode === "light"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent border-border"
                }`}
              >
                <Sun className="size-4" />
                Light
              </button>
              <button
                onClick={() => setMode("dark")}
                className={`flex items-center gap-2 flex-1 py-2 px-4 rounded-md border transition-colors ${
                  mode === "dark"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent border-border"
                }`}
              >
                <Moon className="size-4" />
                Dark
              </button>
            </div>
          </div>

          <Separator />

          {/* Color theme grid */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Color Theme</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {THEME_OPTIONS.map((opt) => {
                const preview = mode === "dark" ? opt.darkPreview : opt.lightPreview
                const isActive = colorTheme === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setColorTheme(opt.id)}
                    className={`relative rounded-lg border-2 p-3 text-left transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: preview.bg }}
                  >
                    {/* Mini palette swatch */}
                    <div className="flex gap-1 mb-2">
                      <span
                        className="h-3 w-6 rounded-sm"
                        style={{ backgroundColor: preview.primary }}
                      />
                      <span
                        className="h-3 w-6 rounded-sm opacity-50"
                        style={{ backgroundColor: preview.text }}
                      />
                    </div>
                    <p className="text-xs font-semibold truncate" style={{ color: preview.text }}>
                      {opt.label}
                    </p>
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2.5" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="size-4" />
                Language
              </label>
              <select
                value={appearance.language}
                onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="en">English</option>
                <option value="ms">Bahasa Melayu</option>
                <option value="zh">中文</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <select
                value={appearance.timezone}
                onChange={(e) => setAppearance({ ...appearance, timezone: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Asia/Kuala_Lumpur">Kuala Lumpur (GMT+8)</option>
                <option value="Asia/Singapore">Singapore (GMT+8)</option>
                <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveAppearance}>
              <Save className="size-4 mr-2" />
              Save Appearance
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Security Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="size-5" />
          <h2 className="text-2xl font-semibold">Security</h2>
        </div>
        
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Shield className="size-4" />
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  value={security.currentPassword}
                  onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-sm text-muted-foreground">
                Password requirements:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleChangePassword}
              disabled={!security.currentPassword || !security.newPassword || !security.confirmPassword}
            >
              <Lock className="size-4 mr-2" />
              Change Password
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Irreversible actions that affect your account
          </p>
        </div>
        
        <div className="bg-destructive/10 rounded-lg border border-destructive/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={() => {
                if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                  alert("Account deletion requested. Please contact administrator.")
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
