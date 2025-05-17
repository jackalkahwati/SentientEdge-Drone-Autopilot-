import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MissionsHeader } from "@/components/missions-header"
import { CircleUser, Shield, Key, Bell, Cpu, Database, Cloud, Wifi, HardDrive, Globe } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MissionsHeader />
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <Button>Save Changes</Button>
          </div>

          <Tabs defaultValue="account" className="w-full">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/4">
                <TabsList className="grid grid-cols-2 md:grid-cols-1 h-auto">
                  <TabsTrigger value="account" className="justify-start h-11 px-4">
                    <CircleUser className="mr-2 h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger value="security" className="justify-start h-11 px-4">
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="justify-start h-11 px-4">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="system" className="justify-start h-11 px-4">
                    <Cpu className="mr-2 h-4 w-4" />
                    System
                  </TabsTrigger>
                  <TabsTrigger value="api" className="justify-start h-11 px-4">
                    <Key className="mr-2 h-4 w-4" />
                    API Access
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="md:w-3/4">
                <TabsContent value="account" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                      <CardDescription>Manage your account details and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">User Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue="Commander Alex Chen" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" defaultValue="alex.chen@stratocommand.gov" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Input id="role" defaultValue="Mission Director" readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input id="department" defaultValue="Tactical Operations" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Interface Preferences</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="dark-mode">Dark Mode</Label>
                              <p className="text-sm text-muted-foreground">Use dark theme for the interface</p>
                            </div>
                            <Switch id="dark-mode" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="compact-mode">Compact Mode</Label>
                              <p className="text-sm text-muted-foreground">Reduce padding and spacing</p>
                            </div>
                            <Switch id="compact-mode" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="animations">Interface Animations</Label>
                              <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                            </div>
                            <Switch id="animations" defaultChecked />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Accessibility</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="high-contrast">High Contrast Mode</Label>
                              <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                            </div>
                            <Switch id="high-contrast" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="screen-reader">Screen Reader Support</Label>
                              <p className="text-sm text-muted-foreground">Optimize interface for screen readers</p>
                            </div>
                            <Switch id="screen-reader" defaultChecked />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your security preferences and access controls</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Authentication</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-password">New Password</Label>
                              <Input id="new-password" type="password" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirm Password</Label>
                              <Input id="confirm-password" type="password" />
                            </div>
                          </div>
                          <Button>Update Password</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>2FA Status</Label>
                              <p className="text-sm text-muted-foreground">
                                Two-factor authentication is currently enabled
                              </p>
                            </div>
                            <Badge variant="outline" className="font-normal">
                              Enabled
                            </Badge>
                          </div>
                          <Button variant="outline">Configure 2FA</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Session Management</h3>
                        <div className="space-y-4">
                          <div className="rounded-md border">
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Current Session</p>
                                  <p className="text-sm text-muted-foreground">
                                    StratoCommand Workstation 3 • 192.168.1.45
                                  </p>
                                </div>
                                <Badge>Active</Badge>
                              </div>
                            </div>
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Mobile Device</p>
                                  <p className="text-sm text-muted-foreground">
                                    SC-Mobile-Command • Last active: 2 hours ago
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  Revoke
                                </Button>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Field Terminal</p>
                                  <p className="text-sm text-muted-foreground">
                                    SC-Field-007 • Last active: 3 days ago
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  Revoke
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline">Revoke All Other Sessions</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>Configure how you want to receive alerts and notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Mission Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Mission Status Updates</Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications when mission status changes
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Mission Completion</Label>
                              <p className="text-sm text-muted-foreground">Notify when missions are completed</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Critical Mission Events</Label>
                              <p className="text-sm text-muted-foreground">
                                Immediate notifications for critical events
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">System Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Drone Status</Label>
                              <p className="text-sm text-muted-foreground">
                                Updates on drone battery, connectivity, and health
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>System Maintenance</Label>
                              <p className="text-sm text-muted-foreground">
                                Scheduled maintenance and update notifications
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Security Alerts</Label>
                              <p className="text-sm text-muted-foreground">
                                Notification of security events and concerns
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Notification Channels</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>In-App Notifications</Label>
                              <p className="text-sm text-muted-foreground">Show notifications within the application</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Email Notifications</Label>
                              <p className="text-sm text-muted-foreground">Send email alerts for important events</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Mobile Push Notifications</Label>
                              <p className="text-sm text-muted-foreground">Send alerts to your mobile device</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="system" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Settings</CardTitle>
                      <CardDescription>Configure system performance and connectivity options</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Performance</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>AI Processing Priority</Label>
                              <p className="text-sm text-muted-foreground">
                                Allocate system resources for AI operations
                              </p>
                            </div>
                            <div className="flex items-center">
                              <Button variant="outline" size="sm" className="rounded-r-none">
                                Low
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-none border-l-0">
                                Medium
                              </Button>
                              <Button variant="default" size="sm" className="rounded-l-none">
                                High
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Cache Management</Label>
                              <p className="text-sm text-muted-foreground">Control how much data is cached locally</p>
                            </div>
                            <div className="flex items-center">
                              <Button variant="outline" size="sm" className="rounded-r-none">
                                2GB
                              </Button>
                              <Button variant="default" size="sm" className="rounded-none border-l-0">
                                5GB
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-l-none">
                                10GB
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Connectivity</h3>
                        <div className="space-y-4">
                          <div className="grid gap-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Wifi className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium">Primary Network</p>
                                  <p className="text-sm text-muted-foreground">SC-SECNET-94A2</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-normal">
                                Connected
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Cloud className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium">Cloud Synchronization</p>
                                  <p className="text-sm text-muted-foreground">Command Cloud Services</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-normal">
                                Synced
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium">Satellite Uplink</p>
                                  <p className="text-sm text-muted-foreground">StratoSat Network</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-normal">
                                Connected
                              </Badge>
                            </div>
                          </div>
                          <Button variant="outline">Test Connections</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Storage Management</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <HardDrive className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">System Storage</p>
                                <p className="text-sm text-muted-foreground">1.2 TB free of 2.0 TB</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Database className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">Mission Data</p>
                                <p className="text-sm text-muted-foreground">542 GB used</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Archive
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="api" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>API Access</CardTitle>
                      <CardDescription>Manage API keys and integrations with external systems</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">API Keys</h3>
                        <div className="space-y-4">
                          <div className="rounded-md border">
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Primary API Key</p>
                                  <p className="text-sm text-muted-foreground">Created on March 15, 2025</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    Regenerate
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Secondary API Key</p>
                                  <p className="text-sm text-muted-foreground">Created on March 22, 2025</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    Regenerate
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button>Generate New API Key</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Webhooks</h3>
                        <div className="space-y-4">
                          <div className="rounded-md border">
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Mission Status Webhook</p>
                                  <p className="text-sm text-muted-foreground">
                                    https://api.command-center.gov/hooks/mission-updates
                                  </p>
                                </div>
                                <Switch defaultChecked />
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Alert Notification Webhook</p>
                                  <p className="text-sm text-muted-foreground">
                                    https://alerts.command-center.gov/incoming
                                  </p>
                                </div>
                                <Switch defaultChecked />
                              </div>
                            </div>
                          </div>
                          <Button variant="outline">Add Webhook</Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Connected Services</h3>
                        <div className="space-y-4">
                          <div className="rounded-md border">
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Command Central</p>
                                  <p className="text-sm text-muted-foreground">Mission data sync and reporting</p>
                                </div>
                                <Badge variant="outline" className="font-normal">
                                  Connected
                                </Badge>
                              </div>
                            </div>
                            <div className="p-4 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Weather Services API</p>
                                  <p className="text-sm text-muted-foreground">Real-time weather data integration</p>
                                </div>
                                <Badge variant="outline" className="font-normal">
                                  Connected
                                </Badge>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Tactical Database</p>
                                  <p className="text-sm text-muted-foreground">Terrain and tactical information</p>
                                </div>
                                <Badge variant="outline" className="font-normal">
                                  Connected
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline">Add Service Connection</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

