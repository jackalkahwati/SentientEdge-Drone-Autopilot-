'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  Home, 
  ArrowUp, 
  ArrowDown, 
  Plane, 
  Battery, 
  Wifi, 
  Satellite, 
  Compass, 
  Gauge,
  Settings,
  Zap,
  Shield,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Target,
  Navigation,
} from 'lucide-react';

import { 
  useArduCopter, 
  CopterFlightMode, 
  CopterParameterCategory, 
  CopterTelemetry 
} from '@/lib/arducopter-integration';
import { SITLVehicleType, SITLManagerClient } from '@/lib/arducopter-sitl-browser';

interface ArduCopterControlPanelProps {
  systemId?: number;
  className?: string;
}

export function ArduCopterControlPanel({ systemId = 1, className = '' }: ArduCopterControlPanelProps) {
  const arducopter = useArduCopter();
  const sitl = new SITLManagerClient();
  
  const [telemetryData, setTelemetryData] = useState<CopterTelemetry[]>([]);
  const [selectedCopter, setSelectedCopter] = useState<CopterTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('flight');
  const [sitlInstances, setSitlInstances] = useState<any[]>([]);
  
  // Flight control states
  const [targetAltitude, setTargetAltitude] = useState(10);
  const [targetLatitude, setTargetLatitude] = useState('');
  const [targetLongitude, setTargetLongitude] = useState('');
  const [motorTestPower, setMotorTestPower] = useState(1100);
  const [selectedMotor, setSelectedMotor] = useState(1);

  // Parameter editing
  const [selectedCategory, setSelectedCategory] = useState<CopterParameterCategory>(CopterParameterCategory.FLIGHT_MODES);
  const [parameterValues, setParameterValues] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Subscribe to telemetry updates
    const unsubscribe = arducopter.addTelemetryListener((data) => {
      setTelemetryData(data);
      if (data.length > 0) {
        const copter = data.find(d => d.systemId === systemId) || data[0];
        setSelectedCopter(copter);
        setIsConnected(true);
      }
    });

    // Subscribe to SITL updates
    const unsubscribeSITL = sitl.addListener((event, data) => {
      if (event === 'started' || event === 'stopped') {
        setSitlInstances(sitl.getInstanceStatus());
      }
    });

    // Initial load
    setSitlInstances(sitl.getInstanceStatus());

    return () => {
      unsubscribe();
      unsubscribeSITL();
    };
  }, [systemId, arducopter, sitl]);

  const handleArmDisarm = useCallback(async () => {
    if (!selectedCopter) return;
    
    try {
      // Command would be sent via MAVLink
      console.log(`${selectedCopter.armed ? 'Disarming' : 'Arming'} copter ${selectedCopter.systemId}`);
    } catch (error) {
      console.error('Failed to arm/disarm:', error);
    }
  }, [selectedCopter]);

  const handleTakeoff = useCallback(async () => {
    if (!selectedCopter) return;
    
    try {
      console.log(`Taking off to ${targetAltitude}m`);
    } catch (error) {
      console.error('Failed to takeoff:', error);
    }
  }, [selectedCopter, targetAltitude]);

  const handleLand = useCallback(async () => {
    if (!selectedCopter) return;
    
    try {
      console.log(`Landing copter ${selectedCopter.systemId}`);
    } catch (error) {
      console.error('Failed to land:', error);
    }
  }, [selectedCopter]);

  const handleReturnToLaunch = useCallback(async () => {
    if (!selectedCopter) return;
    
    try {
      console.log(`Returning to launch for copter ${selectedCopter.systemId}`);
    } catch (error) {
      console.error('Failed to RTL:', error);
    }
  }, [selectedCopter]);

  const handleGotoPosition = useCallback(async () => {
    if (!selectedCopter || !targetLatitude || !targetLongitude) return;
    
    try {
      const lat = parseFloat(targetLatitude);
      const lon = parseFloat(targetLongitude);
      console.log(`Going to position: ${lat}, ${lon}, ${targetAltitude}m`);
    } catch (error) {
      console.error('Failed to go to position:', error);
    }
  }, [selectedCopter, targetLatitude, targetLongitude, targetAltitude]);

  const handleMotorTest = useCallback(async () => {
    try {
      await arducopter.testMotor(selectedMotor, motorTestPower, 3000);
    } catch (error) {
      console.error('Motor test failed:', error);
    }
  }, [arducopter, selectedMotor, motorTestPower]);

  const handleParameterChange = useCallback(async (paramName: string, value: number) => {
    try {
      await arducopter.setParameter(paramName, value);
      setParameterValues(prev => ({ ...prev, [paramName]: value }));
    } catch (error) {
      console.error('Failed to set parameter:', error);
    }
  }, [arducopter]);

  const startSITLInstance = useCallback(async () => {
    try {
      await sitl.startDevelopmentInstance();
    } catch (error) {
      console.error('Failed to start SITL:', error);
    }
  }, [sitl]);

  const getFlightModeColor = (mode: CopterFlightMode): string => {
    switch (mode) {
      case CopterFlightMode.STABILIZE:
      case CopterFlightMode.ALT_HOLD:
      case CopterFlightMode.LOITER:
        return 'bg-blue-500';
      case CopterFlightMode.AUTO:
      case CopterFlightMode.GUIDED:
        return 'bg-green-500';
      case CopterFlightMode.RTL:
      case CopterFlightMode.SMART_RTL:
        return 'bg-yellow-500';
      case CopterFlightMode.LAND:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBatteryColor = (percentage: number): string => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const parameters = arducopter.getParametersByCategory(selectedCategory);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                ArduCopter Control Panel
              </CardTitle>
              <CardDescription>
                Real-time multicopter control and monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {selectedCopter && (
                <Badge variant="outline">
                  System {selectedCopter.systemId}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        {selectedCopter && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Flight Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Flight Mode</Label>
                <Badge className={`${getFlightModeColor(selectedCopter.flightMode)} text-white`}>
                  {selectedCopter.flightModeString}
                </Badge>
              </div>

              {/* Armed Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Armed Status</Label>
                <Badge variant={selectedCopter.armed ? 'destructive' : 'default'}>
                  {selectedCopter.armed ? 'ARMED' : 'DISARMED'}
                </Badge>
              </div>

              {/* Battery */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Battery className="h-4 w-4" />
                  Battery
                </Label>
                <div className="space-y-1">
                  <Progress 
                    value={selectedCopter.battery.remaining} 
                    className={`h-2 ${getBatteryColor(selectedCopter.battery.remaining)}`}
                  />
                  <div className="text-xs text-muted-foreground">
                    {selectedCopter.battery.voltage.toFixed(1)}V | {selectedCopter.battery.remaining}%
                  </div>
                </div>
              </div>

              {/* GPS Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Satellite className="h-4 w-4" />
                  GPS
                </Label>
                <div className="space-y-1">
                  <Badge variant={selectedCopter.sensors.gpsFixType >= 3 ? 'default' : 'destructive'}>
                    {selectedCopter.sensors.gpsFixType >= 3 ? '3D Fix' : 'No Fix'}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {selectedCopter.sensors.gpsNumSat} satellites
                  </div>
                </div>
              </div>
            </div>

            {/* Position and Attitude */}
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Position</Label>
                <div className="text-sm space-y-1">
                  <div>Lat: {selectedCopter.position.lat.toFixed(6)}°</div>
                  <div>Lon: {selectedCopter.position.lon.toFixed(6)}°</div>
                  <div>Alt: {selectedCopter.position.relativeAlt.toFixed(1)}m</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attitude</Label>
                <div className="text-sm space-y-1">
                  <div>Roll: {selectedCopter.attitude.roll.toFixed(1)}°</div>
                  <div>Pitch: {selectedCopter.attitude.pitch.toFixed(1)}°</div>
                  <div>Yaw: {selectedCopter.attitude.yaw.toFixed(1)}°</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Velocity</Label>
                <div className="text-sm space-y-1">
                  <div>Ground: {selectedCopter.velocity.groundSpeed.toFixed(1)} m/s</div>
                  <div>Vertical: {selectedCopter.velocity.vz.toFixed(1)} m/s</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="flight">Flight Control</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="motors">Motors</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="sitl">SITL</TabsTrigger>
        </TabsList>

        {/* Flight Control Tab */}
        <TabsContent value="flight" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Flight Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Flight Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Arm/Disarm */}
                <div className="flex items-center justify-between">
                  <Label>Arm/Disarm</Label>
                  <Button
                    onClick={handleArmDisarm}
                    variant={selectedCopter?.armed ? 'destructive' : 'default'}
                    disabled={!selectedCopter}
                  >
                    {selectedCopter?.armed ? (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Disarm
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Arm
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Takeoff */}
                <div className="space-y-2">
                  <Label>Takeoff Altitude (m)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={targetAltitude}
                      onChange={(e) => setTargetAltitude(Number(e.target.value))}
                      min="1"
                      max="100"
                      step="1"
                    />
                    <Button onClick={handleTakeoff} disabled={!selectedCopter}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Takeoff
                    </Button>
                  </div>
                </div>

                {/* Land */}
                <Button 
                  onClick={handleLand} 
                  disabled={!selectedCopter}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Land
                </Button>

                {/* Return to Launch */}
                <Button 
                  onClick={handleReturnToLaunch} 
                  disabled={!selectedCopter}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Return to Launch
                </Button>
              </CardContent>
            </Card>

            {/* Guided Mode Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Guided Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Latitude</Label>
                    <Input
                      placeholder="37.4239163"
                      value={targetLatitude}
                      onChange={(e) => setTargetLatitude(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input
                      placeholder="-122.0947209"
                      value={targetLongitude}
                      onChange={(e) => setTargetLongitude(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Target Altitude (m)</Label>
                  <Input
                    type="number"
                    value={targetAltitude}
                    onChange={(e) => setTargetAltitude(Number(e.target.value))}
                  />
                </div>

                <Button 
                  onClick={handleGotoPosition}
                  disabled={!selectedCopter || !targetLatitude || !targetLongitude}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Go to Position
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="parameters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Parameter Configuration
              </CardTitle>
              <CardDescription>
                Configure ArduCopter parameters - use caution when modifying values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Selection */}
              <div>
                <Label>Parameter Category</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => setSelectedCategory(value as CopterParameterCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {arducopter.getParameterCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parameters List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parameters.map((param) => (
                  <div key={param.name} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-mono text-sm">{param.name}</Label>
                        <p className="text-xs text-muted-foreground">{param.description}</p>
                      </div>
                      <Badge variant={
                        param.safetyLevel === 'safe' ? 'default' :
                        param.safetyLevel === 'caution' ? 'secondary' : 'destructive'
                      }>
                        {param.safetyLevel}
                      </Badge>
                    </div>
                    
                    {param.type === 'enum' && param.enumValues ? (
                      <Select
                        value={String(parameterValues[param.name] || param.currentValue || param.defaultValue)}
                        onValueChange={(value) => handleParameterChange(param.name, Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(param.enumValues).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : param.type === 'float' || param.type === 'int' ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          value={parameterValues[param.name] || param.currentValue || param.defaultValue}
                          onChange={(e) => setParameterValues(prev => ({ 
                            ...prev, 
                            [param.name]: Number(e.target.value) 
                          }))}
                          onBlur={(e) => handleParameterChange(param.name, Number(e.target.value))}
                          min={param.min}
                          max={param.max}
                          step={param.increment || (param.type === 'int' ? 1 : 0.001)}
                        />
                        {param.unit && (
                          <div className="text-xs text-muted-foreground">
                            Unit: {param.unit}
                            {param.min !== undefined && param.max !== undefined && 
                              ` | Range: ${param.min} - ${param.max}`
                            }
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Motors Tab */}
        <TabsContent value="motors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Motor Testing & Calibration
              </CardTitle>
              <CardDescription>
                Test individual motors and calibrate ESCs - ensure propellers are removed!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  WARNING: Remove all propellers before testing motors. Motor testing can be dangerous.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>Motor Number</Label>
                    <Select 
                      value={String(selectedMotor)} 
                      onValueChange={(value) => setSelectedMotor(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((motor) => (
                          <SelectItem key={motor} value={String(motor)}>
                            Motor {motor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>PWM Value: {motorTestPower}</Label>
                    <Slider
                      value={[motorTestPower]}
                      onValueChange={(value) => setMotorTestPower(value[0])}
                      min={1000}
                      max={2000}
                      step={10}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground">
                      Range: 1000-2000 μs (1000 = stopped, 2000 = full power)
                    </div>
                  </div>

                  <Button 
                    onClick={handleMotorTest}
                    disabled={!selectedCopter}
                    className="w-full"
                  >
                    Test Motor {selectedMotor}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">ESC Calibration</h4>
                  <p className="text-sm text-muted-foreground">
                    Calibrate Electronic Speed Controllers for optimal motor response.
                  </p>
                  <Button 
                    onClick={() => arducopter.calibrateESCs()}
                    variant="outline"
                    className="w-full"
                  >
                    Calibrate ESCs
                  </Button>
                </div>
              </div>

              {/* Motor Outputs Display */}
              {selectedCopter && selectedCopter.motors.motorOutputs.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Motor Outputs</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedCopter.motors.motorOutputs.slice(0, 8).map((output, index) => (
                      <div key={index} className="text-center p-2 border rounded">
                        <div className="text-xs text-muted-foreground">Motor {index + 1}</div>
                        <div className="text-sm font-mono">{output}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety Tab */}
        <TabsContent value="safety" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Geofence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Maximum Altitude (m)</Label>
                  <Input type="number" placeholder="100" min="10" max="500" />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Radius (m)</Label>
                  <Input type="number" placeholder="500" min="50" max="2000" />
                </div>
                <Button className="w-full">Enable Geofence</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Failsafe Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Throttle Failsafe</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">RTL</SelectItem>
                      <SelectItem value="3">Land</SelectItem>
                      <SelectItem value="4">Smart RTL or RTL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>GCS Failsafe</Label>
                  <Select defaultValue="0">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">RTL</SelectItem>
                      <SelectItem value="3">Smart RTL or RTL</SelectItem>
                      <SelectItem value="5">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Update Failsafe</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SITL Tab */}
        <TabsContent value="sitl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                SITL Simulation
              </CardTitle>
              <CardDescription>
                Software In The Loop simulation for testing and development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">SITL Instances</h4>
                  <p className="text-sm text-muted-foreground">
                    {sitlInstances.length} instance(s) configured
                  </p>
                </div>
                <Button onClick={startSITLInstance}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Development SITL
                </Button>
              </div>

              {sitlInstances.length > 0 && (
                <div className="space-y-2">
                  {sitlInstances.map((instance) => (
                    <div key={instance.instanceId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{instance.instanceId}</div>
                        <div className="text-sm text-muted-foreground">
                          {instance.config.vehicleType} | Port: {instance.config.mavlinkPort}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={instance.isRunning ? 'default' : 'secondary'}>
                          {instance.isRunning ? 'Running' : 'Stopped'}
                        </Badge>
                        {instance.isRunning && instance.uptime && (
                          <div className="text-sm text-muted-foreground">
                            {Math.floor(instance.uptime / 1000)}s
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}