
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

export function InvigilatorsByDesignationChart({ data, onTitleClick, isZoomed }: ChartProps) {
  const chartData = useMemo(() => {
    const designationCounts: { [designation: string]: number } = {};
    
    // Use the full invigilator list to get all designations
    data.invigilators.forEach(invigilator => {
        if (!designationCounts[invigilator.designation]) {
          designationCounts[invigilator.designation] = 0;
        }
        designationCounts[invigilator.designation]++;
    });

    return Object.entries(designationCounts).map(([designation, count]) => ({
      designation,
      count,
    }));
  }, [data]);

  const chartConfig = {
    count: {
      label: 'Count',
      color: 'hsl(var(--chart-2))',
    },
  };

  const chartComponent = (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: isZoomed ? 120 : 80, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
            dataKey="designation"
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
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
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
        onClick={() => onTitleClick && onTitleClick(<InvigilatorsByDesignationChart data={data} isZoomed />)}
      >
        <div className="flex items-center justify-between">
            <CardTitle className="text-primary">Invigilator Distribution by Designation</CardTitle>
            <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardDescription>Number of invigilators from each department/designation.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="h-[350px] w-full">
            {chartComponent}
         </div>
      </CardContent>
    </Card>
  );
}
