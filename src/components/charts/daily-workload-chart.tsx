'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, parseISO } from 'date-fns';
import { Maximize } from 'lucide-react';

type ChartProps = {
  data: SavedAllotment;
  onTitleClick?: (chart: React.ReactNode) => void;
  isZoomed?: boolean;
};

export function DailyWorkloadChart({ data, onTitleClick, isZoomed }: ChartProps) {
  const chartData = useMemo(() => {
    const dailyData: { [date: string]: { assigned: number } } = {};
    
    data.assignments.forEach(assignment => {
      const dateStr = format(parseISO(assignment.date), 'dd-MMM-yy');
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { assigned: 0 };
      }
      dailyData[dateStr].assigned += assignment.invigilators.length;
    });

    return Object.entries(dailyData).map(([date, values]) => ({
      date,
      assigned: values.assigned,
      free: data.invigilators.length - values.assigned,
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }, [data]);

  const chartConfig = {
    assigned: {
      label: 'Assigned',
      color: 'hsl(var(--chart-1))',
    },
    free: {
      label: 'Free',
      color: 'hsl(var(--chart-2))',
    },
  };

  const chartComponent = (
     <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }} barSize={26}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" />
            <YAxis 
                dataKey="date" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                style={{ fontSize: isZoomed ? '12px' : '12px' }}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="assigned" stackId="a" fill={chartConfig.assigned.color} radius={[0, 4, 4, 0]} />
            <Bar dataKey="free" stackId="a" fill={chartConfig.free.color} radius={[4, 0, 0, 4]}/>
        </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );

  if (isZoomed) {
    return chartComponent;
  }

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer group"
        onClick={() => onTitleClick && onTitleClick(<DailyWorkloadChart data={data} isZoomed />)}
      >
        <div className="flex items-center justify-between">
            <CardTitle>Daily Invigilator Workload</CardTitle>
            <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardDescription>Assigned vs. Free invigilators for each exam day.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
            {chartComponent}
        </div>
      </CardContent>
    </Card>
  );
}
