'use client';

import React from 'react';
import { ArduCopterControlPanel } from '@/components/arducopter-control-panel';

export default function ArduCopterPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ArduCopter Integration</h1>
          <p className="text-muted-foreground">
            Comprehensive multicopter control and monitoring using ArduPilot ArduCopter
          </p>
        </div>
      </div>

      <ArduCopterControlPanel className="w-full" />
    </div>
  );
}