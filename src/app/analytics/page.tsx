
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DutiesPerInvigilatorChart } from '@/components/charts/duties-per-invigilator-chart';
import { InvigilatorsPerSubjectChart } from '@/components/charts/invigilators-per-subject-chart';
import { DailyWorkloadChart } from '@/components/charts/daily-workload-chart';
import { InvigilatorsByDesignationChart } from '@/components/charts/invigilators-by-designation-chart';
import { SessionTrendsChart } from '@/components/charts/session-trends-chart';
import { BarChart } from 'lucide-react';

export default function AnalyticsPage() {
  const [history, setHistory] = useState<SavedAllotment[]>([]);
  const [selectedAllotmentId, setSelectedAllotmentId] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
    setHistory(savedHistory);
    if (savedHistory.length > 0) {
      setSelectedAllotmentId(savedHistory[0].id);
    }
  }, []);

  const selectedAllotment = useMemo(() => {
    return history.find(item => item.id === selectedAllotmentId) || null;
  }, [history, selectedAllotmentId]);

  return (
    <>
      <div className="sticky top-[70px] bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm">
        <div className="flex h-[52px] items-center justify-center">
          <header className="text-center">
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-2"><BarChart/>Analytics Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-1">Visual insights into your duty allotments</p>
            </div>
          </header>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Allotment</CardTitle>
              <CardDescription>Choose a previously generated allotment to analyze.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={setSelectedAllotmentId} value={selectedAllotmentId || ''}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Select an allotment..." />
                </SelectTrigger>
                <SelectContent>
                  {history.length > 0 ? (
                    history.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.examTitle}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No history found.</div>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {selectedAllotment ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DutiesPerInvigilatorChart data={selectedAllotment} />
                <InvigilatorsByDesignationChart data={selectedAllotment} />
                <InvigilatorsPerSubjectChart data={selectedAllotment} />
                <DailyWorkloadChart data={selectedAllotment} />
                <div className="lg:col-span-2">
                    <SessionTrendsChart data={selectedAllotment} />
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">No Allotment Selected</h2>
                <p className="text-muted-foreground mt-2">Please select a saved allotment from the dropdown to view analytics.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
