"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEnhancedCommunication } from "@/hooks/use-enhanced-communication"
import type { RadioConnection, CommunicationStats, CommunicationProtocol } from "@/hooks/use-enhanced-communication"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Network,
  Radio,
  Satellite,
  Shield,
  Signal,
  Wifi,
  Zap,
  Plus,
  Settings,
  Eye,
  MessageSquare,
  Users
} from "lucide-react"

interface EnhancedCommunicationDashboardProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function EnhancedCommunicationDashboard({ 
  onConnect, 
  onDisconnect 
}: EnhancedCommunicationDashboardProps) {
  const {
    connect,
    disconnect,
    isConnected,
    protocol,
    radioConnections,
    addRadioConnection,
    removeRadioConnection,
    drones,
    sendCommandToDrone,
    createSwarm,
    stats,
    error,
    clearError
  } = useEnhancedCommunication();

  const [selectedProtocol, setSelectedProtocol] = useState<CommunicationProtocol>('hybrid');
  const [showAddRadio, setShowAddRadio] = useState(false);

  // Handle connection
  const handleConnect = async () => {
    const success = await connect(selectedProtocol);
    if (success && onConnect) {
      onConnect();
    }
  };

  const handleDisconnect = async () => {
    const success = await disconnect();
    if (success && onDisconnect) {
      onDisconnect();
    }
  };

  // Radio connection management
  const handleAddRadio = async (config: any) => {
    await addRadioConnection(config);
    setShowAddRadio(false);
  };

  const getProtocolColor = (protocol: CommunicationProtocol) => {
    switch (protocol) {
      case 'mavlink': return 'bg-blue-500';
      case 'cyphal': return 'bg-green-500';
      case 'hybrid': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-gray-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'connecting': return <Activity className="h-4 w-4 animate-pulse" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Radio className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Enhanced Communication System
          </CardTitle>
          <CardDescription>
            Multi-protocol drone communication with mesh networking and redundancy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {isConnected && (
                <Badge variant="outline" className={`${getProtocolColor(protocol)} text-white`}>
                  {protocol.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isConnected && (
                <select 
                  value={selectedProtocol} 
                  onChange={(e) => setSelectedProtocol(e.target.value as CommunicationProtocol)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="mavlink">MAVLink Only</option>
                  <option value="cyphal">Cyphal Only</option>
                  <option value="hybrid">Hybrid (MAVLink + Cyphal)</option>
                </select>
              )}
              
              {isConnected ? (
                <Button onClick={handleDisconnect} variant="outline">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleConnect}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="ml-2"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Communication Statistics */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <p className="text-2xl font-bold">{stats.activeConnections}</p>
                </div>
                <Network className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mesh Nodes</p>
                  <p className="text-2xl font-bold">{stats.meshNodes}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold">{stats.averageLatency}ms</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages/sec</p>
                  <p className="text-2xl font-bold">{stats.messagesPerSecond}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard */}
      {isConnected && (
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="radios">Radio Links</TabsTrigger>
            <TabsTrigger value="mesh">Mesh Network</TabsTrigger>
            <TabsTrigger value="drones">Enhanced Drones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Communication Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Signal Strength</span>
                      <span>95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Packet Success Rate</span>
                      <span>{(100 - stats.packetLoss).toFixed(1)}%</span>
                    </div>
                    <Progress value={100 - stats.packetLoss} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Bandwidth Utilization</span>
                      <span>{Math.min(100, (stats.bandwidth / 1000) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, (stats.bandwidth / 1000) * 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Protocol Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Protocol Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {drones.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Satellite className="h-4 w-4 text-blue-500" />
                            <span>MAVLink Drones</span>
                          </div>
                          <span className="font-medium">
                            {drones.filter(d => d.capabilities.mavlink).length}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span>Cyphal Drones</span>
                          </div>
                          <span className="font-medium">
                            {drones.filter(d => d.capabilities.cyphal).length}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Network className="h-4 w-4 text-purple-500" />
                            <span>Mesh Capable</span>
                          </div>
                          <span className="font-medium">
                            {drones.filter(d => d.capabilities.meshRelay).length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="radios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Radio Connections</CardTitle>
                  <CardDescription>
                    Multiple radio links for redundancy and extended range
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddRadio(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Radio
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {radioConnections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No radio connections configured
                    </div>
                  ) : (
                    radioConnections.map((radio) => (
                      <div key={radio.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-2 ${getStatusColor(radio.status)}`}>
                            {getStatusIcon(radio.status)}
                            <span className="font-medium">{radio.id}</span>
                          </div>
                          
                          <Badge variant={radio.type === 'primary' ? 'default' : 'secondary'}>
                            {radio.type}
                          </Badge>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Signal className="h-4 w-4" />
                            <span>{radio.signalStrength}%</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap className="h-4 w-4" />
                            <span>{radio.latency}ms</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {radio.connectedDrones.length} drones
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeRadioConnection(radio.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mesh">
            <Card>
              <CardHeader>
                <CardTitle>Mesh Network Topology</CardTitle>
                <CardDescription>
                  Real-time visualization of drone-to-drone communication mesh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 border rounded-lg flex items-center justify-center bg-muted/50">
                  <div className="text-center">
                    <Network className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Mesh network visualization</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats.meshNodes} active nodes
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{stats.meshNodes}</div>
                    <div className="text-sm text-muted-foreground">Active Nodes</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">
                      {Math.max(0, stats.meshNodes - 1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Mesh Links</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">
                      {stats.averageLatency}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Mesh Latency</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drones">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Drone Fleet</CardTitle>
                <CardDescription>
                  Drones with advanced communication capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No drones connected
                    </div>
                  ) : (
                    drones.map((drone) => (
                      <div key={drone.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              drone.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <span className="font-medium">{drone.name}</span>
                            <Badge variant="outline">
                              {drone.communicationStatus.protocol.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {drone.battery}%
                            </span>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Signal:</span>
                            <span className="ml-1 font-medium">
                              {drone.communicationStatus.signalStrength}%
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Latency:</span>
                            <span className="ml-1 font-medium">
                              {drone.communicationStatus.latency}ms
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Mesh:</span>
                            <span className="ml-1 font-medium">
                              {drone.capabilities.meshRelay ? 'Yes' : 'No'}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Multi-Radio:</span>
                            <span className="ml-1 font-medium">
                              {drone.capabilities.multiRadio ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Radio Modal (simplified) */}
      {showAddRadio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add Radio Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Radio ID</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., backup_radio_1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Type</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="primary">Primary</option>
                  <option value="backup">Backup</option>
                  <option value="mesh">Mesh</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Protocol</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="mavlink">MAVLink</option>
                  <option value="cyphal">Cyphal</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    handleAddRadio({
                      id: `radio_${Date.now()}`,
                      type: 'backup',
                      protocol: 'mavlink'
                    });
                  }}
                >
                  Add Radio
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddRadio(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default EnhancedCommunicationDashboard;