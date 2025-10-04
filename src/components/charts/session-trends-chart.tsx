
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, parseISO } from 'date-fns';
import { Maximize } from 'lucide-react';

type ChartProps = {
  data: SavedAllotment;
  onTitleClick?: (chart: React.ReactNode) => void;
  isZoomed?: boolean;
};

export function SessionTrendsChart({ data, onTitleClick, isZoomed }: ChartProps) {
  const chartData = useMemo(() => {
    const dailyData: { [date: string]: { totalDuties: number; rooms: number; relievers: number } } = {};

    data.assignments.forEach(assignment => {
      const dateStr = format(parseISO(assignment.date), 'dd-MMM-yy');
      const examDetail = data.examinations.find(e => 
          format(parseISO(e.date), 'yyyy-MM-dd') === assignment.date &&
          e.subject === assignment.subject &&
          `${e.startTime} - ${e.endTime}` === assignment.time
      );

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { totalDuties: 0, rooms: 0, relievers: 0 };
      }

      dailyData[dateStr].totalDuties += assignment.invigilators.length;
      if (examDetail) {
        dailyData[dateStr].rooms += examDetail.roomsAllotted;
        dailyData[dateStr].relievers += examDetail.relieversRequired;
      }
    });

    return Object.entries(dailyData).map(([date, values]) => ({
      date,
      ...values,
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }, [data]);
  
  const chartConfig = {
    totalDuties: {
      label: 'Total Duties',
      color: 'hsl(var(--chart-1))',
    },
    rooms: {
      label: 'Rooms Used',
      color: 'hsl(var(--chart-2))',
    },
    relievers: {
      label: 'Relievers',
      color: 'hsl(var(--chart-3))',
    },
  };

  const chartComponent = (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
                style={{ fontSize: isZoomed ? '12px' : '12px' }}
            />
            <YAxis />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line type="monotone" dataKey="totalDuties" stroke={chartConfig.totalDuties.color} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="rooms" stroke={chartConfig.rooms.color} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="relievers" stroke={chartConfig.relievers.color} strokeWidth={2} dot={false} />
        </LineChart>
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
        onClick={() => onTitleClick && onTitleClick(<SessionTrendsChart data={data} isZoomed />)}
      >
        <div className="flex items-center justify-between">
            <CardTitle className="text-primary">Day-wise Session Trends</CardTitle>
            <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardDescription>Trends for duties, rooms, and relievers over the exam session.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
            {chartComponent}
        </div>
      </CardContent>
    </Card>
  );
}
