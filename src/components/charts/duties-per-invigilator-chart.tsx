
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Maximize } from 'lucide-react';

type ChartProps = {
  data: SavedAllotment;
  onTitleClick?: (chart: React.ReactNode) => void;
  isZoomed?: boolean;
};

export function DutiesPerInvigilatorChart({ data, onTitleClick, isZoomed }: ChartProps) {
  const chartData = useMemo(() => {
    const dutyCounts: { [name: string]: number } = {};
    data.invigilators.forEach(inv => {
      dutyCounts[inv.name] = 0;
    });

    data.assignments.forEach(assignment => {
      assignment.invigilators.forEach(invigilatorName => {
        if (dutyCounts.hasOwnProperty(invigilatorName)) {
          dutyCounts[invigilatorName]++;
        }
      });
    });

    return Object.entries(dutyCounts).map(([name, duties]) => ({ name, duties }));
  }, [data]);
  
  const chartConfig = {
    duties: {
      label: 'Duties',
      color: '#8A2BE2',
    },
  };

  const chartComponent = (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: isZoomed ? 100 : 60, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={isZoomed ? 120 : 100}
            style={{ fontSize: isZoomed ? '12px' : '10px' }}
            />
            <YAxis />
            <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="duties" fill="var(--color-duties)" radius={4} />
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
        onClick={() => onTitleClick && onTitleClick(<DutiesPerInvigilatorChart data={data} isZoomed />)}
      >
        <div className="flex items-center justify-between">
            <CardTitle>Duties Per Invigilator</CardTitle>
            <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardDescription>Total duties assigned to each staff member.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[440px] w-full">
          {chartComponent}
        </div>
      </CardContent>
    </Card>
  );
}
